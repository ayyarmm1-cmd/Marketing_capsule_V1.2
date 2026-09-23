import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
    User, UserRole, Permission, Employee, Lead, LeadStatus, Task, TaskStatus, Project, ProjectStatus, 
    SaleRecord, LeaveRequest, LeaveRequestStatus, TaskPriority, Holiday,
    SaleStatus, Client, PaymentStatus, InventoryTransactionType
} from '../../types';
import { 
    apiGetSalesForPeriod, apiGetLeads, apiGetProjects, apiGetTasks, apiGetEmployees, apiGetAllLeaveRequests, apiGetClients,
    apiGetHolidays, apiGetPaymentsForPeriod, apiGetExpensesForPeriod, apiGetCashAccounts, apiGetInventoryTransactions,
    apiGetPOSProducts
} from '../../services/api';
import Spinner from '../ui/Spinner';
import { Link } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { STATUS_COLORS } from '../../constants';
import { getUpcomingHolidays, formatDateForDisplay } from '../../utils/dateUtils';
import UpcomingHolidaysWidget from './widgets/UpcomingHolidaysWidget';
import StaffAnnouncementsWidget from './widgets/StaffAnnouncementsWidget';
import KpiReminderBanner from './widgets/KpiReminderBanner';
import KpiRatingReminderBanner from './widgets/KpiRatingReminderBanner';

// --- SHARED WIDGET COMPONENTS ---

const KPICard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass?: string; linkTo?: string }> = ({ title, value, icon, colorClass = 'bg-primary-action', linkTo }) => {
  const content = (
    <div className={`p-4 rounded-xl shadow-lg flex items-center space-x-4 ${colorClass} text-white transition-transform hover:scale-105`}>
      <div className="p-3 bg-white bg-opacity-25 rounded-full">{icon}</div>
      <div>
        <p className="text-sm font-medium uppercase tracking-wider opacity-90">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
};


// --- ROLE-SPECIFIC DASHBOARDS ---

const OwnerAdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({ revenue: 0, newLeads: 0, activeProjects: 0, pendingLeave: 0 });
    const [chartData, setChartData] = useState<{name: string, revenue: number}[]>([]);
    const [marginKpis, setMarginKpis] = useState({ grossProfit: 0, netProfit: 0, gpMargin: 0, npMargin: 0 });
    const [cashDistribution, setCashDistribution] = useState<Array<{ name: string; value: number }>>([]);
    const [expenseDistribution, setExpenseDistribution] = useState<Array<{ name: string; value: number }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const thisMonth = new Date().getMonth();
                const thisYear = new Date().getFullYear();
                const periodStart = new Date(thisYear, thisMonth, 1);
                const periodEnd = new Date(thisYear, thisMonth + 1, 0, 23, 59, 59, 999);
                const periodStartStr = periodStart.toISOString().slice(0, 10);
                const periodEndStr = periodEnd.toISOString().slice(0, 10);

                const [sales, leads, projects, leaves, allClients, allEmployees] = await Promise.all([
                    apiGetSalesForPeriod(periodStartStr, periodEndStr),
                    apiGetLeads(),
                    apiGetProjects(),
                    apiGetAllLeaveRequests(),
                    apiGetClients(),
                    apiGetEmployees()
                ]);

                setClients(allClients);
                setEmployees(allEmployees);

                // --- Dashboard Stats Logic (sales already filtered to current month) ---
                const monthlySalesRevenue = sales
                    .filter(s => { const d = new Date(s.createdAt); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
                    .reduce((sum, s) => sum + (s.grandTotalMMK || 0), 0);
                
                const totalMonthlyRevenue = monthlySalesRevenue;

                setStats({
                    revenue: totalMonthlyRevenue,
                    newLeads: leads.filter(l => l.status === LeadStatus.NEW).length,
                    activeProjects: projects.filter(p => p.status === ProjectStatus.ACTIVE).length,
                    pendingLeave: leaves.filter(l => l.status === LeaveRequestStatus.PENDING).length
                });

                const [payments, expenses, cashAccounts, inventoryTransactions, products] = await Promise.all([
                    apiGetPaymentsForPeriod(periodStart.toISOString(), periodEnd.toISOString()),
                    apiGetExpensesForPeriod(periodStart.toISOString(), periodEnd.toISOString()),
                    apiGetCashAccounts(),
                    apiGetInventoryTransactions(),
                    apiGetPOSProducts(),
                ]);

                const approvedPayments = payments.filter(payment => payment.status === PaymentStatus.APPROVED);
                const tradingIncome = approvedPayments.reduce((sum, payment) => sum + (payment.amountMMK || 0), 0);

                const transactionsByProduct = inventoryTransactions.reduce((acc, txn) => {
                    const list = acc.get(txn.productId) || [];
                    list.push(txn);
                    acc.set(txn.productId, list);
                    return acc;
                }, new Map<string, any[]>());

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

                const calculatePurchases = () => {
                    return inventoryTransactions.reduce((sum, txn) => {
                        const txnDate = new Date(txn.createdAt);
                        if (txnDate < periodStart || txnDate > periodEnd) return sum;
                        const isPurchase =
                            txn.type === InventoryTransactionType.PURCHASE ||
                            (txn.type === InventoryTransactionType.ADJUSTMENT && txn.quantity > 0);
                        if (!isPurchase) return sum;
                        const cost = txn.costMMK ?? getProductCost(txn.productId);
                        const quantity = Math.max(txn.quantity, 0);
                        return sum + cost * quantity;
                    }, 0);
                };

                const openingInventory = calculateInventoryValueAt(periodStart);
                const closingInventory = calculateInventoryValueAt(periodEnd);
                const purchases = calculatePurchases();
                const cogs = openingInventory + purchases - closingInventory;
                const grossProfit = tradingIncome - cogs;
                const otherExpenses = expenses.reduce((sum, expense) => {
                    const category = expense.category?.toLowerCase() || '';
                    if (category.includes('bad debt') || category.includes('rent') || category.includes('depreciation')) {
                        return sum + (expense.amountMMK || 0);
                    }
                    return sum;
                }, 0);
                const netProfit = grossProfit - otherExpenses;
                const gpMargin = tradingIncome > 0 ? (grossProfit / tradingIncome) * 100 : 0;
                const npMargin = tradingIncome > 0 ? (netProfit / tradingIncome) * 100 : 0;
                setMarginKpis({ grossProfit, netProfit, gpMargin, npMargin });

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
                    const category = expense.category?.toLowerCase() || '';
                    return category.includes('bad debt') ? sum + (expense.amountMMK || 0) : sum;
                }, 0);
                const otherOperating = expenses.reduce((sum, expense) => {
                    const category = expense.category?.toLowerCase() || '';
                    return category.includes('bad debt') ? sum : sum + (expense.amountMMK || 0);
                }, 0);
                setExpenseDistribution([
                    { name: 'Bad Debt', value: badDebtTotal },
                    { name: 'Other Operating', value: otherOperating },
                ].filter(item => item.value > 0));

                const revenueByMonth = sales
                    .map(s => ({ date: s.createdAt, amount: s.grandTotalMMK }))
                    .reduce((acc, item) => {
                        const month = new Date(item.date).toLocaleString('default', { month: 'short', year: '2-digit' });
                        if (!acc[month]) {
                            acc[month] = 0;
                        }
                        acc[month] += (item.amount || 0);
                        return acc;
                    }, {} as Record<string, number>);

                const monthOrder: {[key: string]: number} = {
                   'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                   'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                };
                
                const sortedChartData = Object.entries(revenueByMonth)
                    .map(([name, revenue]) => {
                        const [monthStr, yearStr] = name.split(' ');
                        const year = parseInt(`20${yearStr}`);
                        const month = monthOrder[monthStr];
                        return { name, revenue, date: new Date(year, month) };
                    })
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .slice(-6)
                    .map(({ name, revenue }) => ({ name, revenue }));

                setChartData(sortedChartData);

            } catch (error) {
                console.error("Failed to load admin dashboard data:", error);
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    if (isLoading) return <div className="flex justify-center items-center h-full py-16"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="This Month's Revenue" value={`${(stats.revenue / 1000000).toFixed(2)}M`} icon={<SalesIcon/>} colorClass="bg-green-600" linkTo="/sales"/>
                <KPICard title="New Leads" value={stats.newLeads} icon={<LeadsIcon/>} colorClass="bg-blue-600" linkTo="/leads"/>
                <KPICard title="Active Projects" value={stats.activeProjects} icon={<ProjectIcon/>} colorClass="bg-indigo-600" linkTo="/projects"/>
                <KPICard title="Pending Leave" value={stats.pendingLeave} icon={<LeaveIcon/>} colorClass="bg-amber-600" linkTo="/hr/leave-admin"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Gross Profit" value={`${(marginKpis.grossProfit / 1000000).toFixed(2)}M`} icon={<SalesIcon/>} colorClass="bg-emerald-600" />
                <KPICard title="Net Profit" value={`${(marginKpis.netProfit / 1000000).toFixed(2)}M`} icon={<SalesIcon/>} colorClass="bg-sky-600" />
                <KPICard title="GP Margin (%)" value={marginKpis.gpMargin.toFixed(1)} icon={<ProjectIcon/>} colorClass="bg-purple-600" />
                <KPICard title="NP Margin (%)" value={marginKpis.npMargin.toFixed(1)} icon={<ProjectIcon/>} colorClass="bg-rose-600" />
            </div>
            <StaffAnnouncementsWidget employees={employees} />
            <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Revenue Overview (Last 6 Periods)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                        <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }} formatter={(value: number) => `${value.toLocaleString()} MMK`}/>
                        <Legend wrapperStyle={{ color: '#f1f5f9' }}/>
                        <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Bank & Wallet Distribution</h3>
                    {cashDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={cashDistribution} dataKey="value" nameKey="name" outerRadius={90} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                                    {cashDistribution.map((entry, index) => (
                                        <Cell key={`cash-${entry.name}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-text-secondary">No balances to display.</p>
                    )}
                </div>
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Expense Breakdown</h3>
                    {expenseDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={expenseDistribution} dataKey="value" nameKey="name" outerRadius={90} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                                    {expenseDistribution.map((entry, index) => (
                                        <Cell key={`expense-${entry.name}`} fill={['#6366F1', '#EF4444', '#F59E0B', '#10B981'][index % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-text-secondary">No expenses for this month.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeamLeaderDashboard: React.FC = () => { /* Placeholder */ return <div>Team Leader Dashboard coming soon.</div>; };

const StaffDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myTasks, setMyTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            const allTasks = await apiGetTasks();
            const openTasks = allTasks
                .filter(t => t.assigneeIds?.includes(user.id) && t.status !== TaskStatus.COMPLETED)
                .sort((a,b) => (b.priority === TaskPriority.HIGH ? 1 : -1) - (a.priority === TaskPriority.HIGH ? 1 : -1)); // High priority first
            setMyTasks(openTasks);
            setIsLoading(false);
        };
        fetchData();
    }, [user]);

    if (isLoading) return <div className="flex justify-center items-center h-full py-16"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
             <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">My Open Tasks</h3>
                {myTasks.length > 0 ? (
                     <ul className="space-y-3">
                        {myTasks.slice(0, 5).map(task => (
                           <li key={task.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                               <Link to={`/tasks/${task.id}`} className="flex justify-between items-center">
                                   <div>
                                       <p className="font-medium text-text-primary dark:text-slate-200">{task.title}</p>
                                       <p className="text-xs text-text-secondary dark:text-slate-400">Due: {task.dueDate ? formatDateForDisplay(task.dueDate) : 'N/A'}</p>
                                   </div>
                                   <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[task.status] || 'bg-gray-200'}`}>{task.status}</span>
                               </Link>
                           </li>
                        ))}
                    </ul>
                ): <p className="text-text-secondary dark:text-slate-400">No open tasks assigned to you. Great job!</p>}
                <Link to="/my-tasks" className="text-primary-action text-sm font-medium mt-4 inline-block hover:underline">View All My Tasks &rarr;</Link>
            </div>
            {/* Can add more staff-centric widgets here */}
        </div>
    );
};

const DashboardPage: React.FC = () => {
  const { user, loading, hasPermission } = useAuth();
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [isHolidayLoading, setIsHolidayLoading] = useState(true);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const allHolidays = await apiGetHolidays();
        const upcoming = getUpcomingHolidays(allHolidays, 30);
        setUpcomingHolidays(upcoming);
      } catch (error) {
        console.error("Failed to load holiday data:", error);
      }
      setIsHolidayLoading(false);
    };
    fetchHolidays();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-center text-text-secondary">User not found. Please log in.</p>;
  }
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };
  
  const canRateKpis = hasPermission(Permission.RATE_TEAM_KPIS);

  return (
    <div className="space-y-6">
        <div className="p-6 bg-gradient-to-r from-blue-500 to-sky-400 text-white rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold">{getGreeting()}, {user.name}!</h2>
            <p className="mt-1 text-blue-100">Here's your 360° overview for today.</p>
        </div>

        <KpiReminderBanner />
        {canRateKpis && <KpiRatingReminderBanner />}

        {!isHolidayLoading && upcomingHolidays.length > 0 && (
            <UpcomingHolidaysWidget holidays={upcomingHolidays} />
        )}

        {(() => {
            switch (user.role) {
                case UserRole.OWNER:
                case UserRole.ADMIN:
                    return <OwnerAdminDashboard />;
                case UserRole.TEAM_LEADER:
                    return <TeamLeaderDashboard />;
                case UserRole.STAFF:
                    return <StaffDashboard />;
                default:
                    return <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow">Dashboard not configured for your role.</div>;
            }
        })()}
    </div>
  );
};

// Icons (used in KPICards)
const SalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const LeadsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>;
const ProjectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.5 13.5h3.75" /></svg>;
const LeaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008Z" /></svg>;

export default DashboardPage;