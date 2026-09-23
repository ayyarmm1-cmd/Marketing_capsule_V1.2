import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiGetSalesRecords } from '../../services/api';
import { SaleRecord, Permission, SaleStatus } from '../../types';
import Spinner from '../ui/Spinner';
import ReportSection from './ui/ReportSection';
import StatDisplayCard from './ui/StatDisplayCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { apiGetClients, apiGetUsers } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { downloadCSV } from '../../utils/downloadUtils';

const SalesReport: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { effectiveTheme } = useTheme();
  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
      const [fetchedSales, fetchedClients, fetchedUsers] = await Promise.all([
        apiGetSalesRecords(),
        apiGetClients(),
        apiGetUsers()
      ]);
      if (hasPermission(Permission.VIEW_ALL_SALES_RECORDS)) {
        setSalesRecords(fetchedSales);
      } else {
        setSalesRecords(fetchedSales.filter(sale => sale.inChargeUserId === user.id));
      }
      setClients(fetchedClients);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch sales data:", error);
    }
    setIsLoading(false);
  }, [user, hasPermission]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSales = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return salesRecords.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= start && saleDate <= end;
    });
  }, [salesRecords, startDate, endDate]);

  const totalSalesRecords = filteredSales.length;
  const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + (sale.grandTotalMMK || 0), 0);
  const averageSaleValue = totalSalesRecords > 0 ? (totalSalesAmount / totalSalesRecords) : 0;

  const salesByType = filteredSales.reduce((acc, sale) => {
    acc[sale.type] = (acc[sale.type] || 0) + (sale.grandTotalMMK || 0);
    return acc;
  }, {} as Record<string, number>);

  const salesByTypeChartData = Object.entries(salesByType).map(([name, value]) => ({ name, value }));
  
  const typeColors = {
    'Facebook Ads': '#3B82F6',
    'Other Services': '#10B981',
  };

  // Monthly sales trend
  const monthlySales = useMemo(() => {
    const monthly: Record<string, { month: string; sales: number; count: number }> = {};
    filteredSales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[monthKey]) {
        monthly[monthKey] = { month: monthKey, sales: 0, count: 0 };
      }
      monthly[monthKey].sales += sale.grandTotalMMK || 0;
      monthly[monthKey].count += 1;
    });
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredSales]);


  // Top clients by sales
  const topClients = useMemo(() => {
    const clientSales: Record<string, { clientId: string; amount: number; count: number }> = {};
    filteredSales.forEach(sale => {
      const clientId = sale.clientId || sale.businessId || 'Unknown';
      if (!clientSales[clientId]) {
        clientSales[clientId] = { clientId, amount: 0, count: 0 };
      }
      clientSales[clientId].amount += sale.grandTotalMMK || 0;
      clientSales[clientId].count += 1;
    });
    return Object.values(clientSales)
      .map(c => ({
        ...c,
        name: clients.find(cl => cl.id === c.clientId)?.name || 'Unknown Client'
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [filteredSales, clients]);

  // Top salespeople
  const topSalespeople = useMemo(() => {
    const salespersonSales: Record<string, { userId: string; amount: number; count: number }> = {};
    filteredSales.forEach(sale => {
      const userId = sale.inChargeUserId || 'Unknown';
      if (!salespersonSales[userId]) {
        salespersonSales[userId] = { userId, amount: 0, count: 0 };
      }
      salespersonSales[userId].amount += sale.grandTotalMMK || 0;
      salespersonSales[userId].count += 1;
    });
    return Object.values(salespersonSales)
      .map(s => ({
        ...s,
        name: users.find(u => u.id === s.userId)?.name || 'Unknown User'
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [filteredSales, users]);

  const handleDownload = () => {
    const summaryData = [
      { Metric: "Total Sales Records", Value: totalSalesRecords },
      { Metric: "Total Sales Amount (MMK)", Value: totalSalesAmount },
      { Metric: "Average Sale Value (MMK)", Value: averageSaleValue },
    ];
    const typeData = salesByTypeChartData.map(s => ({ "Service Type": s.name, "Total Sales (MMK)": s.value }));
    
    downloadCSV(summaryData, "sales_report_summary.csv");
    downloadCSV(typeData, "sales_by_service_type.csv");
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
    <ReportSection title="Sales Report" description="Overview of sales performance and revenue streams.">
      <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-end gap-4 mb-2">
          <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} containerClassName="mb-0 flex-grow"/>
          <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} containerClassName="mb-0 flex-grow"/>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('this_month')}>This Month</Button>
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('last_3_months')}>Last 3 Months</Button>
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('last_6_months')}>Last 6 Months</Button>
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('this_year')}>This Year</Button>
        </div>
      </div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleDownload} variant="secondary" size="sm">Download CSVs</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatDisplayCard title="Total Sales Records" value={totalSalesRecords} />
        <StatDisplayCard title="Total Sales Amount" value={`${totalSalesAmount.toLocaleString()} MMK`} isCurrency />
        <StatDisplayCard title="Average Sale Value" value={`${averageSaleValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} MMK`} isCurrency />
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Sales by Service Type</h4>
        {salesByTypeChartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesByTypeChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString()} MMK`}
                  contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
                />
            <Bar dataKey="value" name="Total Sales (MMK)">
                 {salesByTypeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={typeColors[entry.name as keyof typeof typeColors] || '#8884d8'} />
                  ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        ) : (
            <p className="text-text-secondary dark:text-slate-400 text-center py-4">No sales data available.</p>
          )}
        </div>

      </div>

      {/* Monthly Trend */}
      {monthlySales.length > 0 && (
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Monthly Sales Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
              <XAxis dataKey="month" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
              <Tooltip 
                formatter={(value: number) => `${value.toLocaleString()} MMK`}
                contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
              />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} name="Sales Amount (MMK)" />
              <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} name="Number of Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Clients Table */}
      {topClients.length > 0 && (
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Top 10 Clients by Sales</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Client Name</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Total Sales (MMK)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Number of Sales</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {topClients.map((client, index) => (
                  <tr key={client.clientId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">#{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{client.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-text-primary dark:text-slate-200 font-medium">{client.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-text-secondary dark:text-slate-400">{client.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Salespeople Table */}
      {topSalespeople.length > 0 && (
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Top 10 Salespeople</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Salesperson</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Total Sales (MMK)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Number of Sales</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {topSalespeople.map((person, index) => (
                  <tr key={person.userId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">#{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{person.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-text-primary dark:text-slate-200 font-medium">{person.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-text-secondary dark:text-slate-400">{person.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Sales Table */}
      <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Recent Sales (Last 20)</h4>
        {filteredSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredSales
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 20)
                  .map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                        {new Date(sale.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">{sale.type}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-text-primary dark:text-slate-200">
                        {(sale.grandTotalMMK || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary text-center py-4">No sales data available.</p>
        )}
      </div>
    </ReportSection>
  );
};

export default SalesReport;