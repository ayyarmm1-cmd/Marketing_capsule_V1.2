import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { apiGetPaymentsForPeriod, apiGetExpensesForPeriod, apiGetVisaReloadsForPeriod, apiGetPayrollTotalsForPeriod } from '../../services/api';
import Spinner from '../ui/Spinner';
import Select from '../ui/Select';
import Button from '../ui/Button'; // Added for fetch button
import { useTheme } from '../../hooks/useTheme';

type PeriodType = 'Monthly' | 'Quarterly' | 'Yearly';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
  isCurrency?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, colorClass = 'bg-primary-action', isCurrency = false }) => (
  <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center space-x-4">
    <div className={`p-3 rounded-full ${colorClass} text-white`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-text-secondary dark:text-slate-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-text-primary dark:text-slate-100">
        {isCurrency && typeof value === 'number' ? `${value.toLocaleString()} MMK` : value}
      </p>
    </div>
  </div>
);

const RevenueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const ProfitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>;
const ExpensesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.21 12.75 11 12 11c-.75 0-1.536.21-2.098.707L9 12.25M9 19.5V12.75" /></svg>;

const FinanceHRDashboard: React.FC = () => {
  const { effectiveTheme } = useTheme();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>('Monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor((new Date().getMonth() / 3)) + 1); // 1-4

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: (currentYear - i).toString() }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
  const quarterOptions = [
    { value: 1, label: 'Q1 (Jan-Mar)' },
    { value: 2, label: 'Q2 (Apr-Jun)' },
    { value: 3, label: 'Q3 (Jul-Sep)' },
    { value: 4, label: 'Q4 (Oct-Dec)' },
  ];

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    let startDate: Date;
    let endDate: Date;

    if (periodType === 'Monthly') {
      startDate = new Date(selectedYear, selectedMonth - 1, 1);
      endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
    } else if (periodType === 'Quarterly') {
      const quarterStartMonth = (selectedQuarter - 1) * 3;
      startDate = new Date(selectedYear, quarterStartMonth, 1);
      endDate = new Date(selectedYear, quarterStartMonth + 3, 0, 23, 59, 59, 999);
    } else { // Yearly
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    }

    try {
      const payments = await apiGetPaymentsForPeriod(startDate.toISOString(), endDate.toISOString());
      const expensesData = await apiGetExpensesForPeriod(startDate.toISOString(), endDate.toISOString());
      const visaReloadsData = await apiGetVisaReloadsForPeriod(startDate.toISOString(), endDate.toISOString());

      let totalSalaryPaid = 0;
      if (periodType === 'Monthly') {
        const payrollMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        const payrollTotal = await apiGetPayrollTotalsForPeriod(payrollMonthStr);
        totalSalaryPaid = payrollTotal.totalNetPayable;
      } else { // Quarterly or Yearly - sum monthly payrolls
        const startMonth = periodType === 'Quarterly' ? (selectedQuarter - 1) * 3 : 0;
        const endMonth = periodType === 'Quarterly' ? startMonth + 2 : 11;
        for (let m = startMonth; m <= endMonth; m++) {
            const payrollMonthStr = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
            const monthlyPayroll = await apiGetPayrollTotalsForPeriod(payrollMonthStr);
            totalSalaryPaid += monthlyPayroll.totalNetPayable;
        }
      }
      
      const currentRevenue = payments.reduce((sum, p) => sum + p.amountMMK, 0);
      const currentExpenses = expensesData.reduce((sum, exp) => sum + exp.amountMMK, 0);
      const currentVisaReloadsMMK = visaReloadsData.reduce((sum, reload) => sum + reload.amountMMK, 0);
      
      const allExpenses = currentExpenses + currentVisaReloadsMMK + totalSalaryPaid;
      
      setTotalRevenue(currentRevenue);
      setTotalExpenses(allExpenses);
      setTotalProfit(currentRevenue - allExpenses);

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setTotalRevenue(0); setTotalExpenses(0); setTotalProfit(0); // Reset on error
    }
    setIsLoading(false);
  }, [periodType, selectedYear, selectedMonth, selectedQuarter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const revenueSourceData: { name: string; value: number; color: string }[] = [];
  const costStructureData: { name: string; value: number; color: string }[] = [];
  
  const chartColors = {
      axis: effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280',
      grid: effectiveTheme === 'dark' ? '#334155' : '#e5e7eb',
      tooltipBg: effectiveTheme === 'dark' ? '#1e293b' : '#ffffff',
      tooltipBorder: effectiveTheme === 'dark' ? '#334155' : '#e5e7eb',
      legend: effectiveTheme === 'dark' ? '#f1f5f9' : '#1e293b'
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100">Finance & HR Dashboard</h1>
         <div className="flex items-end space-x-2 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg shadow-sm">
            <Select label="Period Type" options={[{value: 'Monthly', label: 'Monthly'}, {value: 'Quarterly', label: 'Quarterly'}, {value: 'Yearly', label: 'Yearly'}]} value={periodType} onChange={e => setPeriodType(e.target.value as PeriodType)} containerClassName="mb-0"/>
            <Select label="Year" options={yearOptions} value={selectedYear.toString()} onChange={e => setSelectedYear(Number(e.target.value))} containerClassName="mb-0"/>
            {periodType === 'Monthly' && <Select label="Month" options={monthOptions} value={selectedMonth.toString()} onChange={e => setSelectedMonth(Number(e.target.value))} containerClassName="mb-0"/>}
            {periodType === 'Quarterly' && <Select label="Quarter" options={quarterOptions} value={selectedQuarter.toString()} onChange={e => setSelectedQuarter(Number(e.target.value))} containerClassName="mb-0"/>}
            <Button onClick={fetchDashboardData} isLoading={isLoading} size="md">Fetch Data</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg"/></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPICard title={`Revenue (${periodType})`} value={totalRevenue} icon={<RevenueIcon />} colorClass="bg-status-success" isCurrency />
            <KPICard title={`Profit (${periodType})`} value={totalProfit} icon={<ProfitIcon />} colorClass="bg-primary-action" isCurrency />
            <KPICard title={`Expenses (${periodType})`} value={totalExpenses} icon={<ExpensesIcon />} colorClass="bg-status-danger" isCurrency />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200 mb-4">Revenue Sources</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueSourceData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid}/>
                  <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} stroke={chartColors.axis} />
                  <YAxis dataKey="name" type="category" width={100} stroke={chartColors.axis} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}` }} />
                  <Legend wrapperStyle={{ color: chartColors.legend }}/>
                  <Bar dataKey="value" name="Revenue" >
                    {revenueSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200 mb-4">Cost Structure</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costStructureData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid}/>
                  <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} stroke={chartColors.axis} />
                  <YAxis dataKey="name" type="category" width={100} stroke={chartColors.axis} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}` }} />
                  <Legend wrapperStyle={{ color: chartColors.legend }} />
                  <Bar dataKey="value" name="Cost">
                    {costStructureData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinanceHRDashboard;