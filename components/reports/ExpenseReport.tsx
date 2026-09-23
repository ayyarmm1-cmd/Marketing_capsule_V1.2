import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiGetExpenses, apiGetExpenseCategorySettings, apiGetUsers } from '../../services/api';
import { Expense, ExpenseCategorySetting, User } from '../../types';
import Spinner from '../ui/Spinner';
import ReportSection from './ui/ReportSection';
import StatDisplayCard from './ui/StatDisplayCard';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { downloadCSV } from '../../utils/downloadUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../../hooks/useTheme';

const ExpenseReport: React.FC = () => {
  const { user } = useAuth();
  const { effectiveTheme } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategorySetting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const { start: initialStart, end: initialEnd } = { 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), 
    end: new Date() 
  };
  const [startDate, setStartDate] = useState(initialStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialEnd.toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [fetchedExpenses, fetchedCategories, fetchedUsers] = await Promise.all([
        apiGetExpenses(),
        apiGetExpenseCategorySettings(),
        apiGetUsers(),
      ]);
      setExpenses(fetchedExpenses);
      setCategories(fetchedCategories.filter(cat => cat.isActive));
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch expense report data:", error);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredExpenses = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    let filtered = expenses.filter(exp => {
      const expDate = new Date(exp.expenseDate);
      return expDate >= start && expDate <= end;
    });
    
    if (selectedCategory) {
      filtered = filtered.filter(exp => exp.category === selectedCategory);
    }
    
    return filtered;
  }, [expenses, selectedCategory, startDate, endDate]);

  // Monthly expense trend
  const monthlyExpenses = useMemo(() => {
    const monthly: Record<string, { month: string; amount: number; count: number }> = {};
    filteredExpenses.forEach(exp => {
      const date = new Date(exp.expenseDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[monthKey]) {
        monthly[monthKey] = { month: monthKey, amount: 0, count: 0 };
      }
      monthly[monthKey].amount += exp.amountMMK;
      monthly[monthKey].count += 1;
    });
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredExpenses]);

  // Expenses by category chart data
  const expensesByCategoryChart = useMemo(() => {
    const categoryData: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amountMMK;
    });
    return Object.entries(categoryData).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const totalFilteredExpensesAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amountMMK, 0);
  }, [filteredExpenses]);

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || userId;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');

  const handleDownload = () => {
    const dataToExport = filteredExpenses.map(exp => ({
      ID: exp.id,
      Date: formatDate(exp.expenseDate),
      Category: exp.category,
      Description: exp.description,
      AmountMMK: exp.amountMMK,
      RecordedBy: getUserName(exp.recordedByUserId),
    }));
    downloadCSV(dataToExport, `expense_report${selectedCategory ? '_' + selectedCategory.replace(/\s+/g, '_') : ''}.csv`);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  const handlePresetClick = (preset: string) => {
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
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <ReportSection title="Expense Report" description="Detailed breakdown of company expenses.">
      <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-end gap-4 mb-2">
          <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} containerClassName="mb-0 flex-grow"/>
          <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} containerClassName="mb-0 flex-grow"/>
          <Select
            label="Filter by Category"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            options={[{ value: '', label: 'All Categories' }, ...categories.map(cat => ({ value: cat.name, label: cat.name }))]}
            containerClassName="mb-0 flex-grow"
          />
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('this_month')}>This Month</Button>
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('last_3_months')}>Last 3 Months</Button>
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('last_6_months')}>Last 6 Months</Button>
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('this_year')}>This Year</Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleDownload} variant="secondary" size="sm" disabled={filteredExpenses.length === 0}>
            Download CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatDisplayCard title="Total Expenses (Filtered)" value={`${totalFilteredExpensesAmount.toLocaleString()} MMK`} isCurrency />
        <StatDisplayCard title="Number of Expenses (Filtered)" value={filteredExpenses.length} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Expenses by Category</h4>
          {expensesByCategoryChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategoryChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {expensesByCategoryChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#10B981'][index % 6]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString()} MMK`}
                  contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-secondary dark:text-slate-400 text-center py-4">No expense data available.</p>
          )}
        </div>

        {monthlyExpenses.length > 0 && (
          <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Monthly Expense Trend</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
                <XAxis dataKey="month" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString()} MMK`}
                  contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
                />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#EF4444" strokeWidth={2} name="Expense Amount (MMK)" />
                <Line type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} name="Number of Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {filteredExpenses.length > 0 ? (
        <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Amount (MMK)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Recorded By</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredExpenses.map(exp => (
                <tr key={exp.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{formatDate(exp.expenseDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{exp.category}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{exp.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary text-right">{exp.amountMMK.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{getUserName(exp.recordedByUserId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-text-secondary py-8">No expenses found for the selected criteria.</p>
      )}
    </ReportSection>
  );
};

export default ExpenseReport;