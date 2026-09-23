import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  apiGetAllowanceForDoubtfulDebts,
  apiGetBadDebts,
  apiGetVisaCards,
  apiGetExpenses,
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
  AllowanceForDoubtfulDebts,
  BadDebt,
  VisaCard,
} from '../../types';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ComposedChart, Line, Area
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { 
  TrendingUp, TrendingDown, Building2, Wallet, CreditCard, 
  PiggyBank, Receipt, Landmark, Scale, ArrowLeftRight,
  Calendar, ChevronDown, ChevronUp, FileSpreadsheet, ExternalLink,
  Banknote, AlertTriangle, Users, Package, BadgeDollarSign
} from 'lucide-react';

type ComparisonView = 'current-vs-previous' | 'monthly' | 'quarterly' | 'semi-annual' | 'yearly';

interface PeriodData {
  label: string;
  shortLabel: string;
  start: Date;
  end: Date;
}

interface BalanceSheetData {
  period: PeriodData;
  // Non-Current Assets
  fixedAssetsCost: number;
  fixedAssetsDepreciation: number;
  fixedAssetsNBV: number;
  // Current Assets
  inventory: number;
  cashAndBank: number;
  visaCardBalance: number;
  accountsReceivable: number;
  allowanceForDoubtfulDebts: number;
  badDebtsWrittenOff: number;
  totalCurrentAssets: number;
  totalAssets: number;
  // Current Liabilities
  accountsPayable: number;
  shortTermDebt: number;
  salaryPayable: number;
  totalCurrentLiabilities: number;
  // Non-Current Liabilities
  longTermDebt: number;
  totalNonCurrentLiabilities: number;
  totalLiabilities: number;
  // Equity
  openingCapital: number;
  additionalCapital: number;
  retainedEarnings: number;
  drawings: number;
  totalEquity: number;
  // Totals
  totalLiabilitiesAndEquity: number;
  // Accounting Equation Check
  isBalanced: boolean;
  // Additional data for display
  visaCardReloads: number;
  totalExpenses: number;
}

const normalizeCategory = (value: string) => value.trim().toLowerCase();
const isBetween = (date: Date, start: Date, end: Date) => date >= start && date <= end;

const BalanceSheetPage: React.FC = () => {
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const { hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonView, setComparisonView] = useState<ComparisonView>('current-vs-previous');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    nonCurrentAssets: true,
    currentAssets: true,
    currentLiabilities: true,
    nonCurrentLiabilities: true,
    equity: true,
  });

  const chartColors = useMemo(() => [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ], []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({
      value: String(currentYear - i),
      label: String(currentYear - i),
    }));
  }, []);

  const generatePeriods = useCallback((view: ComparisonView, year: number): PeriodData[] => {
    const periods: PeriodData[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    switch (view) {
      case 'current-vs-previous': {
        // Get current month and previous month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Previous month
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const prevStart = new Date(prevYear, prevMonth, 1);
        const prevEnd = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);
        periods.push({
          label: `${monthNames[prevMonth]} ${prevYear}`,
          shortLabel: `${monthNames[prevMonth]} (Prev)`,
          start: prevStart,
          end: prevEnd,
        });
        
        // Current month
        const currStart = new Date(currentYear, currentMonth, 1);
        const currEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        periods.push({
          label: `${monthNames[currentMonth]} ${currentYear}`,
          shortLabel: `${monthNames[currentMonth]} (Current)`,
          start: currStart,
          end: currEnd,
        });
        break;
      }
      case 'monthly':
        for (let month = 0; month < 12; month++) {
          const start = new Date(year, month, 1);
          const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
          periods.push({
            label: `${monthNames[month]} ${year}`,
            shortLabel: monthNames[month],
            start,
            end,
          });
        }
        break;
      case 'quarterly':
        for (let q = 0; q < 4; q++) {
          const start = new Date(year, q * 3, 1);
          const end = new Date(year, (q + 1) * 3, 0, 23, 59, 59, 999);
          periods.push({
            label: `Q${q + 1} ${year}`,
            shortLabel: `Q${q + 1}`,
            start,
            end,
          });
        }
        break;
      case 'semi-annual':
        periods.push({
          label: `H1 ${year}`,
          shortLabel: 'H1',
          start: new Date(year, 0, 1),
          end: new Date(year, 5, 30, 23, 59, 59, 999),
        });
        periods.push({
          label: `H2 ${year}`,
          shortLabel: 'H2',
          start: new Date(year, 6, 1),
          end: new Date(year, 11, 31, 23, 59, 59, 999),
        });
        break;
      case 'yearly':
        for (let y = year - 2; y <= year; y++) {
          periods.push({
            label: String(y),
            shortLabel: String(y),
            start: new Date(y, 0, 1),
            end: new Date(y, 11, 31, 23, 59, 59, 999),
          });
        }
        break;
    }
    
    return periods;
  }, []);

  const fetchBalanceSheetData = useCallback(async () => {
    setIsLoading(true);
    
    const periods = generatePeriods(comparisonView, selectedYear);
    const earliestStart = periods.reduce((min, p) => p.start < min ? p.start : min, periods[0].start);
    const latestEnd = periods.reduce((max, p) => p.end > max ? p.end : max, periods[0].end);
    
    // Fetch all required data
    const extendedStart = new Date(earliestStart);
    extendedStart.setFullYear(extendedStart.getFullYear() - 2);
    
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
        allowanceRecords,
        badDebts,
        visaCards,
        allExpenses,
      ] = await Promise.all([
        apiGetPaymentsForPeriod(extendedStart.toISOString(), latestEnd.toISOString()),
        apiGetExpensesForPeriod(extendedStart.toISOString(), latestEnd.toISOString()),
        apiGetInvoices(),
        apiGetAPInvoices(),
        apiGetCashAccounts(),
        apiGetRefunds(),
        apiGetLoanAgreements(),
        apiGetFixedAssets(),
        apiGetEquityEvents(),
        apiGetInventoryTransactions(),
        apiGetPOSProducts(),
        apiGetAllowanceForDoubtfulDebts(),
        apiGetBadDebts(),
        apiGetVisaCards(),
        apiGetExpenses(),
      ]);

      const approvedPayments = payments.filter(p => p.status === PaymentStatus.APPROVED);
      const productMap = new Map(products.map(p => [p.id, p]));
      const transactionsByProduct = inventoryTransactions.reduce((acc, txn) => {
        const list = acc.get(txn.productId) || [];
        list.push(txn);
        acc.set(txn.productId, list);
        return acc;
      }, new Map<string, InventoryTransaction[]>());

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

      const buildBalanceSheetForPeriod = (period: PeriodData): BalanceSheetData => {
        const { start, end } = period;

        // === NON-CURRENT ASSETS (Fixed Assets) ===
        const activeAssets = fixedAssets.filter(asset => {
          if (asset.status === 'Disposed') return false;
          const acquisitionDate = new Date(asset.acquisitionDate);
          return acquisitionDate <= end;
        });
        const fixedAssetsCost = activeAssets.reduce((sum, a) => sum + (a.cost || 0), 0);
        const fixedAssetsDepreciation = activeAssets.reduce((sum, a) => sum + (a.accumulatedDepreciation || 0), 0);
        const fixedAssetsNBV = activeAssets.reduce((sum, a) => sum + (a.bookValue || 0), 0);

        // === CURRENT ASSETS ===
        // Inventory
        const inventory = calculateInventoryValueAt(end);

        // Cash and Bank
        const cashAndBank = cashAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

        // Accounts Receivable
        const accountsReceivable = invoices.reduce((sum, invoice) => {
          const invoiceDate = new Date(invoice.issueDate || invoice.createdAt);
          if (invoiceDate > end) return sum;
          if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(invoice.status)) return sum;
          const outstanding = Math.max((invoice.grandTotal || 0) - (invoice.amountPaid || 0), 0);
          return sum + outstanding;
        }, 0);

        // Visa Card Balance (using monthly limit as proxy for available balance)
        const visaCardBalance = visaCards.reduce((sum, card) => sum + (card.monthlyLimitUSD || 0) * 2100, 0); // Convert USD to MMK approx

        // Visa Card Reloads total (monthly limit represents reloaded amount)
        const visaCardReloads = visaCards.reduce((sum, card) => sum + (card.monthlyLimitMMK || 0), 0);

        // Allowance for Doubtful Debts
        const allowanceForDoubtfulDebts = allowanceRecords.length > 0 
          ? allowanceRecords[0].currentBalance 
          : expenses.reduce((sum, expense) => {
              const expenseDate = new Date(expense.expenseDate);
              if (!isBetween(expenseDate, start, end)) return sum;
              return normalizeCategory(expense.category).includes('bad debt') ? sum + (expense.amountMMK || 0) : sum;
            }, 0);

        // Bad Debts Written Off
        const badDebtsWrittenOff = badDebts.reduce((sum, bd) => {
          const writeOffDate = new Date(bd.writeOffDate);
          if (!isBetween(writeOffDate, start, end)) return sum;
          return sum + (bd.writtenOffAmount || 0);
        }, 0);

        // Total Expenses for the period
        const totalExpenses = allExpenses.reduce((sum, expense) => {
          const expenseDate = new Date(expense.expenseDate);
          if (!isBetween(expenseDate, start, end)) return sum;
          return sum + (expense.amountMMK || 0);
        }, 0);

        const totalCurrentAssets = inventory + cashAndBank + visaCardBalance + accountsReceivable - allowanceForDoubtfulDebts;
        const totalAssets = fixedAssetsNBV + totalCurrentAssets;

        // === CURRENT LIABILITIES ===
        // Accounts Payable
        const accountsPayable = apInvoices.reduce((sum, ap) => {
          const invoiceDate = new Date(ap.invoiceDate);
          if (invoiceDate > end) return sum;
          if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(ap.status)) return sum;
          return sum + (ap.amount || 0);
        }, 0);

        // Pending refunds
        const refundsPending = refunds.reduce((sum, refund) => {
          const refundDate = new Date(refund.refundDate);
          if (refundDate > end) return sum;
          return refund.status === RefundStatus.PENDING ? sum + (refund.amountMMK || 0) : sum;
        }, 0);

        // Short-term debt (loans maturing within 1 year)
        const currentLiabilityCutoff = new Date(end);
        currentLiabilityCutoff.setFullYear(currentLiabilityCutoff.getFullYear() + 1);
        
        const shortTermDebt = loanAgreements.reduce((sum, loan) => {
          const maturity = new Date(loan.maturityDate);
          if (maturity <= currentLiabilityCutoff) {
            return sum + (loan.outstandingPrincipal || 0);
          }
          return sum;
        }, 0);

        // Salary Payable (estimate based on salary expenses in expenses)
        const salaryPayable = allExpenses.reduce((sum, expense) => {
          const expenseDate = new Date(expense.expenseDate);
          if (!isBetween(expenseDate, start, end)) return sum;
          const category = normalizeCategory(expense.category);
          if (category.includes('salary') || category.includes('payroll') || category.includes('wage')) {
            return sum + (expense.amountMMK || 0);
          }
          return sum;
        }, 0);

        const totalCurrentLiabilities = accountsPayable + refundsPending + shortTermDebt + salaryPayable;

        // === NON-CURRENT LIABILITIES ===
        const longTermDebt = loanAgreements.reduce((sum, loan) => {
          const maturity = new Date(loan.maturityDate);
          if (maturity > currentLiabilityCutoff) {
            return sum + (loan.outstandingPrincipal || 0);
          }
          return sum;
        }, 0);

        const totalNonCurrentLiabilities = longTermDebt;
        const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

        // === EQUITY ===
        const openingCapital = equityEvents.reduce((sum, event) => {
          const eventDate = new Date(event.eventDate);
          if (eventDate >= start) return sum;
          const sign = event.type === 'Dividend' ? -1 : 1;
          return sum + sign * (event.amount || 0);
        }, 0);

        const additionalCapital = equityEvents.reduce((sum, event) => {
          const eventDate = new Date(event.eventDate);
          if (!isBetween(eventDate, start, end)) return sum;
          return event.type === 'Issuance' ? sum + (event.amount || 0) : sum;
        }, 0);

        const drawings = equityEvents.reduce((sum, event) => {
          const eventDate = new Date(event.eventDate);
          if (!isBetween(eventDate, start, end)) return sum;
          return event.type === 'Dividend' ? sum + (event.amount || 0) : sum;
        }, 0);

        // Calculate retained earnings (profit/loss)
        const periodRevenue = approvedPayments
          .filter(p => {
            const paymentDate = new Date(p.paymentDate);
            return isBetween(paymentDate, start, end);
          })
          .reduce((sum, p) => sum + (p.amountMMK || 0), 0);

        const periodExpenses = expenses
          .filter(e => {
            const expenseDate = new Date(e.expenseDate);
            return isBetween(expenseDate, start, end);
          })
          .reduce((sum, e) => sum + (e.amountMMK || 0), 0);

        const retainedEarnings = periodRevenue - periodExpenses;

        const totalEquity = openingCapital + additionalCapital + retainedEarnings - drawings;
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        // Accounting Equation Check: A = L + E
        const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1;

        return {
          period,
          fixedAssetsCost,
          fixedAssetsDepreciation,
          fixedAssetsNBV,
          inventory,
          cashAndBank,
          visaCardBalance,
          accountsReceivable,
          allowanceForDoubtfulDebts,
          badDebtsWrittenOff,
          totalCurrentAssets,
          totalAssets,
          accountsPayable,
          shortTermDebt,
          salaryPayable,
          totalCurrentLiabilities,
          longTermDebt,
          totalNonCurrentLiabilities,
          totalLiabilities,
          openingCapital,
          additionalCapital,
          retainedEarnings,
          drawings,
          totalEquity,
          totalLiabilitiesAndEquity,
          isBalanced,
          visaCardReloads,
          totalExpenses,
        };
      };

      const data = periods.map(buildBalanceSheetForPeriod);
      setBalanceSheetData(data);
    } catch (error) {
      console.error('Failed to load balance sheet data:', error);
    }
    
    setIsLoading(false);
  }, [comparisonView, selectedYear, generatePeriods]);

  useEffect(() => {
    fetchBalanceSheetData();
  }, [fetchBalanceSheetData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  const getChangeIndicator = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return null;
    const change = ((current - previous) / Math.abs(previous)) * 100;
    const isPositive = change > 0;
    return (
      <span className={`inline-flex items-center text-xs ml-2 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  // Chart data
  const assetCompositionData = useMemo(() => {
    if (balanceSheetData.length === 0) return [];
    const latest = balanceSheetData[balanceSheetData.length - 1];
    return [
      { name: 'Fixed Assets (NBV)', value: latest.fixedAssetsNBV },
      { name: 'Inventory', value: latest.inventory },
      { name: 'Cash & Bank', value: latest.cashAndBank },
      { name: 'Accounts Receivable', value: Math.max(0, latest.accountsReceivable - latest.allowanceForDoubtfulDebts) },
    ].filter(item => item.value > 0);
  }, [balanceSheetData]);

  const liabilityEquityData = useMemo(() => {
    if (balanceSheetData.length === 0) return [];
    const latest = balanceSheetData[balanceSheetData.length - 1];
    return [
      { name: 'Current Liabilities', value: latest.totalCurrentLiabilities },
      { name: 'Long-term Debt', value: latest.longTermDebt },
      { name: 'Equity', value: latest.totalEquity },
    ].filter(item => item.value > 0);
  }, [balanceSheetData]);

  const trendChartData = useMemo(() => {
    return balanceSheetData.map(d => ({
      name: d.period.shortLabel,
      assets: d.totalAssets,
      liabilities: d.totalLiabilities,
      equity: d.totalEquity,
    }));
  }, [balanceSheetData]);

  if (!hasPermission(Permission.VIEW_FINANCIAL_REPORTS)) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-semibold text-red-500 mb-4">Access Denied</h2>
        <p className="text-slate-600 dark:text-slate-400">You do not have permission to view financial reports.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Balance Sheet</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Statement of Financial Position</p>
          </div>
        </div>
        
        {/* Accounting Equation Banner */}
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white">
          <div className="flex items-center justify-center gap-4 text-lg font-semibold">
            <span className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Assets
            </span>
            <span>=</span>
            <span className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Liabilities
            </span>
            <span>+</span>
            <span className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5" />
              Equity
            </span>
          </div>
          <p className="text-center text-sm text-blue-100 mt-2">The Fundamental Accounting Equation</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Comparison View"
            value={comparisonView}
            onChange={e => setComparisonView(e.target.value as ComparisonView)}
            options={[
              { value: 'current-vs-previous', label: 'Current vs Previous Month' },
              { value: 'monthly', label: 'Monthly (Full Year)' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'semi-annual', label: 'Semi-Annual' },
              { value: 'yearly', label: 'Yearly' },
            ]}
            containerClassName="mb-0 min-w-[200px]"
          />
          <Select
            label="Year"
            value={String(selectedYear)}
            onChange={e => setSelectedYear(Number(e.target.value))}
            options={yearOptions}
            containerClassName="mb-0 min-w-[120px]"
          />
          <Button onClick={fetchBalanceSheetData} isLoading={isLoading} className="mb-0">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => window.print()} className="mb-0">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {balanceSheetData.length > 0 && (() => {
              const latest = balanceSheetData[balanceSheetData.length - 1];
              const prev = balanceSheetData.length > 1 ? balanceSheetData[balanceSheetData.length - 2] : undefined;
              return (
                <>
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Total Assets</p>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(latest.totalAssets)} MMK</p>
                        {prev && getChangeIndicator(latest.totalAssets, prev.totalAssets)}
                      </div>
                      <Building2 className="w-10 h-10 text-emerald-200" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-rose-100 text-sm font-medium">Total Liabilities</p>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(latest.totalLiabilities)} MMK</p>
                        {prev && getChangeIndicator(latest.totalLiabilities, prev.totalLiabilities)}
                      </div>
                      <CreditCard className="w-10 h-10 text-rose-200" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Equity</p>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(latest.totalEquity)} MMK</p>
                        {prev && getChangeIndicator(latest.totalEquity, prev.totalEquity)}
                      </div>
                      <PiggyBank className="w-10 h-10 text-blue-200" />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Side-by-Side Comparison Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Period Comparison
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-700">
                    <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-100 dark:bg-slate-700 min-w-[200px]">
                      Account
                    </th>
                    {balanceSheetData.map((d, idx) => (
                      <th key={idx} className="text-right p-3 font-semibold text-slate-700 dark:text-slate-200 min-w-[120px]">
                        {d.period.shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {/* ASSETS */}
                  <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                    <td colSpan={balanceSheetData.length + 1} className="p-3 font-bold text-emerald-700 dark:text-emerald-400">
                      ASSETS
                    </td>
                  </tr>

                  {/* Non-Current Assets Section */}
                  <tr 
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    onClick={() => toggleSection('nonCurrentAssets')}
                  >
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        {expandedSections.nonCurrentAssets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <Landmark className="w-4 h-4 text-slate-500" />
                        Non-Current Assets
                      </div>
                    </td>
                    {balanceSheetData.map((d, idx) => (
                      <td key={idx} className="text-right p-3 font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(d.fixedAssetsNBV)}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.nonCurrentAssets && (
                    <>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/fixed-assets')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <Landmark className="w-3 h-3" />
                            Fixed Assets (Cost)
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.fixedAssetsCost)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30">
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          Accumulated Depreciation
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-red-500 dark:text-red-400">
                            ({formatCurrency(d.fixedAssetsDepreciation)})
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30">
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30 font-medium">
                          Net Book Value (NBV)
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">
                            {formatCurrency(d.fixedAssetsNBV)}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}

                  {/* Current Assets Section */}
                  <tr 
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    onClick={() => toggleSection('currentAssets')}
                  >
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        {expandedSections.currentAssets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <Wallet className="w-4 h-4 text-slate-500" />
                        Current Assets
                      </div>
                    </td>
                    {balanceSheetData.map((d, idx) => (
                      <td key={idx} className="text-right p-3 font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(d.totalCurrentAssets)}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.currentAssets && (
                    <>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/pos/products')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <Package className="w-3 h-3" />
                            Closing Inventory
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.inventory)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/cash')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <Banknote className="w-3 h-3" />
                            Bank & Cash
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.cashAndBank)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/visa-cards')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <CreditCard className="w-3 h-3" />
                            Visa Card Balance
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.visaCardBalance)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/ar')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <Receipt className="w-3 h-3" />
                            Accounts Receivable
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.accountsReceivable)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/bad-debts')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <AlertTriangle className="w-3 h-3" />
                            (−) Allowance for Doubtful Debts
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-red-500 dark:text-red-400">
                            ({formatCurrency(d.allowanceForDoubtfulDebts)})
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/bad-debts')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <AlertTriangle className="w-3 h-3" />
                            (−) Bad Debts Written Off
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-red-500 dark:text-red-400">
                            ({formatCurrency(d.badDebtsWrittenOff)})
                          </td>
                        ))}
                      </tr>
                    </>
                  )}

                  {/* Total Assets */}
                  <tr className="bg-emerald-100 dark:bg-emerald-900/30 font-bold">
                    <td className="p-3 text-emerald-700 dark:text-emerald-400 sticky left-0 bg-emerald-100 dark:bg-emerald-900/30">
                      TOTAL ASSETS
                    </td>
                    {balanceSheetData.map((d, idx) => (
                      <td key={idx} className="text-right p-3 text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(d.totalAssets)}
                      </td>
                    ))}
                  </tr>

                  {/* LIABILITIES */}
                  <tr className="bg-rose-50 dark:bg-rose-900/20">
                    <td colSpan={balanceSheetData.length + 1} className="p-3 font-bold text-rose-700 dark:text-rose-400">
                      LIABILITIES
                    </td>
                  </tr>

                  {/* Current Liabilities Section */}
                  <tr 
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    onClick={() => toggleSection('currentLiabilities')}
                  >
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        {expandedSections.currentLiabilities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <Receipt className="w-4 h-4 text-slate-500" />
                        Current Liabilities
                      </div>
                    </td>
                    {balanceSheetData.map((d, idx) => (
                      <td key={idx} className="text-right p-3 font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(d.totalCurrentLiabilities)}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.currentLiabilities && (
                    <>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/ap')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <Receipt className="w-3 h-3" />
                            Accounts Payable
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.accountsPayable)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/capital')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <Landmark className="w-3 h-3" />
                            Short-term Debt
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.shortTermDebt)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/hr/payroll')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <Users className="w-3 h-3" />
                            Salary Payable
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.salaryPayable)}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}

                  {/* Non-Current Liabilities Section */}
                  <tr 
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    onClick={() => toggleSection('nonCurrentLiabilities')}
                  >
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        {expandedSections.nonCurrentLiabilities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <Landmark className="w-4 h-4 text-slate-500" />
                        Non-Current Liabilities
                      </div>
                    </td>
                    {balanceSheetData.map((d, idx) => (
                      <td key={idx} className="text-right p-3 font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(d.totalNonCurrentLiabilities)}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.nonCurrentLiabilities && (
                    <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/capital')}>
                      <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                        <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                          <Landmark className="w-3 h-3" />
                          Long-term Debt
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </td>
                      {balanceSheetData.map((d, idx) => (
                        <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                          {formatCurrency(d.longTermDebt)}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Total Liabilities */}
                  <tr className="bg-rose-100 dark:bg-rose-900/30 font-bold">
                    <td className="p-3 text-rose-700 dark:text-rose-400 sticky left-0 bg-rose-100 dark:bg-rose-900/30">
                      TOTAL LIABILITIES
                    </td>
                    {balanceSheetData.map((d, idx) => (
                      <td key={idx} className="text-right p-3 text-rose-700 dark:text-rose-400">
                        {formatCurrency(d.totalLiabilities)}
                      </td>
                    ))}
                  </tr>

                  {/* EQUITY */}
                  <tr className="bg-blue-50 dark:bg-blue-900/20">
                    <td colSpan={balanceSheetData.length + 1} className="p-3 font-bold text-blue-700 dark:text-blue-400">
                      EQUITY
                    </td>
                  </tr>

                  {/* Equity Section */}
                  <tr 
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    onClick={() => toggleSection('equity')}
                  >
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        {expandedSections.equity ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <PiggyBank className="w-4 h-4 text-slate-500" />
                        Owner's Equity
                      </div>
                    </td>
                    {balanceSheetData.map((d, idx) => (
                      <td key={idx} className="text-right p-3 font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(d.totalEquity)}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.equity && (
                    <>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/capital')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <PiggyBank className="w-3 h-3" />
                            Opening Capital
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.openingCapital)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/capital')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <BadgeDollarSign className="w-3 h-3" />
                            Additional Capital
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-slate-600 dark:text-slate-400">
                            {formatCurrency(d.additionalCapital)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/analytics')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <TrendingUp className="w-3 h-3" />
                            Retained Earnings (P/L)
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className={`text-right p-3 ${d.retainedEarnings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {formatCurrency(d.retainedEarnings)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer" onClick={() => navigate('/finance/capital')}>
                        <td className="p-3 pl-10 text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50/50 dark:bg-slate-700/30">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                            <TrendingDown className="w-3 h-3" />
                            (−) Drawings
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                        {balanceSheetData.map((d, idx) => (
                          <td key={idx} className="text-right p-3 text-red-500 dark:text-red-400">
                            ({formatCurrency(d.drawings)})
                          </td>
                        ))}
                      </tr>
                    </>
                  )}

                  {/* Total Equity */}
                  <tr className="bg-blue-100 dark:bg-blue-900/30 font-bold">
                    <td className="p-3 text-blue-700 dark:text-blue-400 sticky left-0 bg-blue-100 dark:bg-blue-900/30">
                      TOTAL EQUITY
                    </td>
                    {balanceSheetData.map((d, idx) => (
                      <td key={idx} className="text-right p-3 text-blue-700 dark:text-blue-400">
                        {formatCurrency(d.totalEquity)}
                      </td>
                    ))}
                  </tr>

                  {/* Total Liabilities + Equity */}
                  <tr className="bg-indigo-100 dark:bg-indigo-900/30 font-bold border-t-2 border-indigo-300 dark:border-indigo-600">
                    <td className="p-3 text-indigo-700 dark:text-indigo-400 sticky left-0 bg-indigo-100 dark:bg-indigo-900/30">
                      TOTAL LIABILITIES + EQUITY
                    </td>
                    {balanceSheetData.map((d, idx) => (
                      <td key={idx} className="text-right p-3 text-indigo-700 dark:text-indigo-400">
                        {formatCurrency(d.totalLiabilitiesAndEquity)}
                        {d.isBalanced ? (
                          <span className="ml-2 text-green-500">✓</span>
                        ) : (
                          <span className="ml-2 text-red-500">✗</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Trend Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Assets vs Liabilities vs Equity Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="name" stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString()} MMK`}
                    contentStyle={{
                      backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#ffffff',
                      borderColor: effectiveTheme === 'dark' ? '#334155' : '#e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="assets" fill="#10b98133" stroke="#10b981" strokeWidth={2} name="Assets" />
                  <Bar dataKey="liabilities" fill="#ef4444" name="Liabilities" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} name="Equity" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Asset Composition */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-500" />
                Asset Composition
              </h3>
              {assetCompositionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={assetCompositionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      labelLine={false}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    >
                      {assetCompositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-slate-500">No data available</div>
              )}
            </div>

            {/* Liability & Equity Mix */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-500" />
                Liabilities & Equity Mix
              </h3>
              {liabilityEquityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={liabilityEquityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      labelLine={false}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    >
                      {liabilityEquityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[(index + 3) % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-slate-500">No data available</div>
              )}
            </div>

            {/* Period-over-Period Comparison */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                Period Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <YAxis type="category" dataKey="name" stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} width={50} />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString()} MMK`}
                    contentStyle={{
                      backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#ffffff',
                      borderColor: effectiveTheme === 'dark' ? '#334155' : '#e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="assets" fill="#10b981" name="Assets" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="liabilities" fill="#ef4444" name="Liabilities" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="equity" fill="#3b82f6" name="Equity" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financial Ratios */}
          {balanceSheetData.length > 0 && (() => {
            const latest = balanceSheetData[balanceSheetData.length - 1];
            const currentRatio = latest.totalCurrentLiabilities > 0 
              ? (latest.totalCurrentAssets / latest.totalCurrentLiabilities).toFixed(2) 
              : 'N/A';
            const debtToEquity = latest.totalEquity > 0 
              ? (latest.totalLiabilities / latest.totalEquity).toFixed(2) 
              : 'N/A';
            const equityRatio = latest.totalAssets > 0 
              ? ((latest.totalEquity / latest.totalAssets) * 100).toFixed(1) 
              : 'N/A';
            const debtRatio = latest.totalAssets > 0 
              ? ((latest.totalLiabilities / latest.totalAssets) * 100).toFixed(1) 
              : 'N/A';

            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Key Financial Ratios</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Current Ratio</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentRatio}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Current Assets / Current Liabilities</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Debt-to-Equity</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{debtToEquity}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Total Debt / Total Equity</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Equity Ratio</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{equityRatio}%</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Equity / Total Assets</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Debt Ratio</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{debtRatio}%</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Total Debt / Total Assets</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default BalanceSheetPage;
