import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGetPaymentsForPeriod, apiGetExpensesForPeriod, apiGetVisaReloadsForPeriod, apiGetPayrollTotalsForPeriod, apiGetExpenseCategorySettings } from '../../services/api';
import Spinner from '../ui/Spinner';
import ReportSection from './ui/ReportSection';
import StatDisplayCard from './ui/StatDisplayCard';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { downloadCSV } from '../../utils/downloadUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useTheme } from '../../hooks/useTheme';

// Helper function to get start and end dates for presets
const getDateRangeForPreset = (preset: string): { start: Date, end: Date } => {
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
    return { start, end };
};

const CompanyFinancialReport: React.FC = () => {
    const { effectiveTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [reportData, setReportData] = useState({
        clientRevenue: 0,
        totalRevenue: 0,
        expenses: 0,
        visaReloads: 0,
        payroll: 0,
        profit: 0,
        expensesByCategory: {} as Record<string, number>,
        monthlyBreakdown: [] as Array<{ month: string; revenue: number; expenses: number; profit: number }>
    });

    const { start: initialStart, end: initialEnd } = getDateRangeForPreset('this_month');
    const [startDate, setStartDate] = useState(initialStart.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(initialEnd.toISOString().split('T')[0]);

    const calculatePayrollForPeriod = async (start: Date, end: Date): Promise<number> => {
        let totalPayroll = 0;
        let currentDate = new Date(start.getFullYear(), start.getMonth(), 1);

        while (currentDate <= end) {
            const payrollMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const monthlyTotal = await apiGetPayrollTotalsForPeriod(payrollMonthStr);
            totalPayroll += monthlyTotal.totalNetPayable;
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        return totalPayroll;
    };

    const fetchReportData = useCallback(async (startStr: string, endStr: string) => {
        setIsLoading(true);
        const start = new Date(startStr);
        const end = new Date(endStr);

        try {
            const [clientPayments, expensesData, visaReloadsData, payrollTotal, expenseCategories] = await Promise.all([
                apiGetPaymentsForPeriod(start.toISOString(), end.toISOString()),
                apiGetExpensesForPeriod(start.toISOString(), end.toISOString()),
                apiGetVisaReloadsForPeriod(start.toISOString(), end.toISOString()),
                calculatePayrollForPeriod(start, end),
                apiGetExpenseCategorySettings()
            ]);
            
            const clientRevenue = clientPayments.reduce((sum, p) => sum + p.amountMMK, 0);
            const totalRevenue = clientRevenue;
            const expenses = expensesData.reduce((sum, exp) => sum + exp.amountMMK, 0);
            const visaReloads = visaReloadsData.reduce((sum, reload) => sum + reload.amountMMK, 0);
            const totalExpenses = expenses + visaReloads + payrollTotal;
            const profit = totalRevenue - totalExpenses;

            // Expenses by category
            const expensesByCategory: Record<string, number> = {};
            expensesData.forEach(exp => {
                expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amountMMK;
            });

            // Monthly breakdown - fetch all payroll data first
            const monthlyBreakdown: Array<{ month: string; revenue: number; expenses: number; profit: number }> = [];
            const payrollPromises: Promise<{ month: string; payroll: number }>[] = [];
            let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
            
            while (currentMonth <= end) {
                const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                payrollPromises.push(
                    apiGetPayrollTotalsForPeriod(monthStr).then(p => ({ month: monthStr, payroll: p.totalNetPayable }))
                );
                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }
            
            const payrollData = await Promise.all(payrollPromises);
            const payrollMap = new Map(payrollData.map(p => [p.month, p.payroll]));
            
            // Now calculate monthly breakdown
            currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
            while (currentMonth <= end) {
                const monthStart = new Date(currentMonth);
                const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);
                if (monthEnd > end) monthEnd.setTime(end.getTime());

                const monthPayments = clientPayments.filter(p => {
                    const pDate = new Date(p.paymentDate);
                    return pDate >= monthStart && pDate <= monthEnd;
                });
                const monthExpenses = expensesData.filter(e => {
                    const eDate = new Date(e.expenseDate);
                    return eDate >= monthStart && eDate <= monthEnd;
                });
                const monthVisaReloads = visaReloadsData.filter(v => {
                    const vDate = new Date(v.reloadDate);
                    return vDate >= monthStart && vDate <= monthEnd;
                });

                const monthRevenue = monthPayments.reduce((s, p) => s + p.amountMMK, 0);
                const monthExpensesTotal = monthExpenses.reduce((s, e) => s + e.amountMMK, 0) + 
                                         monthVisaReloads.reduce((s, v) => s + v.amountMMK, 0);
                
                const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                const monthPayroll = payrollMap.get(monthStr) || 0;
                const totalMonthExpenses = monthExpensesTotal + monthPayroll;

                monthlyBreakdown.push({
                    month: monthStr,
                    revenue: monthRevenue,
                    expenses: totalMonthExpenses,
                    profit: monthRevenue - totalMonthExpenses
                });

                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }

            setReportData({ 
                clientRevenue, 
                totalRevenue, 
                expenses, 
                visaReloads, 
                payroll: payrollTotal, 
                profit,
                expensesByCategory,
                monthlyBreakdown
            });

        } catch (error) {
            console.error("Failed to fetch financial report data:", error);
        }
        setIsLoading(false);
    }, []);
    
    useEffect(() => {
        fetchReportData(startDate, endDate);
    }, [startDate, endDate, fetchReportData]);

    const handleFetchClick = () => {
        fetchReportData(startDate, endDate);
    };

    const handlePresetClick = (preset: string) => {
        const { start, end } = getDateRangeForPreset(preset);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const handleDownload = () => {
        const data = [
            { Item: 'Total Revenue (Client Services)', Amount: reportData.clientRevenue },
            { Item: '--- TOTAL REVENUE ---', Amount: reportData.totalRevenue },
            { Item: 'Total Expenses (General)', Amount: reportData.expenses },
            { Item: 'Total VISA Card Reloads', Amount: reportData.visaReloads },
            { Item: 'Total Payroll', Amount: reportData.payroll },
            { Item: '--- TOTAL EXPENSES ---', Amount: reportData.expenses + reportData.visaReloads + reportData.payroll },
            { Item: '--- PROFIT / LOSS ---', Amount: reportData.profit },
        ];
        downloadCSV(data, `financial_report_${startDate}_to_${endDate}.csv`);
    };

    return (
        <ReportSection title="360° Company Financial Report" description="Analyze overall company financial performance over a specified period.">
            <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-end gap-4 mb-2">
                    <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} containerClassName="mb-0 flex-grow"/>
                    <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} containerClassName="mb-0 flex-grow"/>
                    <Button onClick={handleFetchClick} isLoading={isLoading}>Fetch Data</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handlePresetClick('this_month')}>This Month</Button>
                    <Button variant="ghost" size="sm" onClick={() => handlePresetClick('last_3_months')}>Last 3 Months</Button>
                    <Button variant="ghost" size="sm" onClick={() => handlePresetClick('last_6_months')}>Last 6 Months</Button>
                    <Button variant="ghost" size="sm" onClick={() => handlePresetClick('this_year')}>This Year</Button>
                </div>
            </div>

            {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : (
                <>
                    <div className="flex justify-end mb-4">
                        <Button onClick={handleDownload} variant="secondary" size="sm">Download CSV</Button>
                    </div>
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <StatDisplayCard title="Total Revenue" value={`${reportData.totalRevenue.toLocaleString()} MMK`} isCurrency colorClass="bg-status-success text-white" />
                        <StatDisplayCard title="Total Expenses (All)" value={`${(reportData.expenses + reportData.visaReloads + reportData.payroll).toLocaleString()} MMK`} isCurrency colorClass="bg-status-danger text-white" />
                        <StatDisplayCard title="Profit / Loss" value={`${reportData.profit.toLocaleString()} MMK`} isCurrency colorClass={reportData.profit >= 0 ? "bg-primary-action text-white" : "bg-gray-700 text-white"} />
                    </div>

                    {/* Revenue vs Expenses Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                            <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Revenue Breakdown</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Client Services', value: reportData.clientRevenue }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        <Cell fill="#10B981" />
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                            <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Expenses Breakdown</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'General Expenses', value: reportData.expenses },
                                            { name: 'VISA Reloads', value: reportData.visaReloads },
                                            { name: 'Payroll', value: reportData.payroll }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        <Cell fill="#EF4444" />
                                        <Cell fill="#F59E0B" />
                                        <Cell fill="#8B5CF6" />
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Monthly Trend */}
                    {reportData.monthlyBreakdown.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
                            <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Monthly Trend</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={reportData.monthlyBreakdown}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
                                    <XAxis dataKey="month" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                                    <Tooltip 
                                        formatter={(value: number) => `${value.toLocaleString()} MMK`}
                                        contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
                                    <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
                                    <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} name="Profit/Loss" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Expenses by Category */}
                    {Object.keys(reportData.expensesByCategory).length > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
                            <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Expenses by Category</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart 
                                    data={Object.entries(reportData.expensesByCategory).map(([name, value]) => ({ name, value }))}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
                                    <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                                    <YAxis dataKey="name" type="category" width={150} stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                                    <Tooltip 
                                        formatter={(value: number) => `${value.toLocaleString()} MMK`}
                                        contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
                                    />
                                    <Bar dataKey="value" fill="#EF4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Detailed Breakdown */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                        <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-3">Detailed Breakdown for Selected Period</h4>
                        <div className="space-y-2 text-sm">
                            <p className="flex justify-between font-medium text-green-700 dark:text-green-400"><span>(+) Client Services Revenue:</span> <span className="font-mono">{reportData.clientRevenue.toLocaleString()} MMK</span></p>
                            <p className="flex justify-between text-red-700 dark:text-red-400"><span>(-) General Expenses:</span> <span className="font-mono">{reportData.expenses.toLocaleString()} MMK</span></p>
                            <p className="flex justify-between text-red-700 dark:text-red-400"><span>(-) VISA Card Reloads:</span> <span className="font-mono">{reportData.visaReloads.toLocaleString()} MMK</span></p>
                            <p className="flex justify-between text-red-700 dark:text-red-400"><span>(-) Payroll:</span> <span className="font-mono">{reportData.payroll.toLocaleString()} MMK</span></p>
                            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
                                <p className="flex justify-between font-bold text-lg">
                                    <span>Net Profit / Loss:</span> 
                                    <span className={`font-mono ${reportData.profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                        {reportData.profit >= 0 ? '+' : ''}{reportData.profit.toLocaleString()} MMK
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </ReportSection>
    );
};

export default CompanyFinancialReport;