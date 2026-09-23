import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { POSRevenue, SalesType } from '../../types';
import { apiGetPOSRevenue, apiGetPOSRevenueByType } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';

const RevenueDashboard: React.FC = () => {
    const { addNotification } = useNotification();
    const [revenue, setRevenue] = useState<POSRevenue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedType, setSelectedType] = useState<SalesType | ''>('');

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        setStartDate(firstDayOfMonth);
        setEndDate(today);
    }, []);

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, selectedType]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedRevenue = selectedType
                ? await apiGetPOSRevenueByType(selectedType as SalesType, startDate, endDate)
                : await apiGetPOSRevenue(startDate, endDate);
            setRevenue(fetchedRevenue);
        } catch (error) {
            console.error("Failed to load revenue data:", error);
            addNotification("Failed to load revenue data.", "error");
        }
        setIsLoading(false);
    }, [startDate, endDate, selectedType, addNotification]);

    const totalRevenue = useMemo(() => {
        return revenue.reduce((sum, r) => sum + r.amountMMK, 0);
    }, [revenue]);

    const revenueByType = useMemo(() => {
        const byType: Record<SalesType, number> = {
            [SalesType.STANDARD]: 0,
            [SalesType.SUBSCRIPTION]: 0,
            [SalesType.WHOLESALE]: 0,
            [SalesType.RETAIL]: 0,
        };
        revenue.forEach(r => {
            byType[r.salesType] = (byType[r.salesType] || 0) + r.amountMMK;
        });
        return byType;
    }, [revenue]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">POS Revenue Dashboard</h1>
            </div>

            <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        containerClassName="mb-0"
                    />
                    <Input
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        containerClassName="mb-0"
                    />
                    <Select
                        label="Sales Type"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as SalesType | '')}
                        options={[
                            { value: '', label: 'All Types' },
                            ...Object.values(SalesType).map(st => ({ value: st, label: st }))
                        ]}
                        containerClassName="mb-0"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-lg shadow">
                    <div className="text-sm text-text-secondary mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold text-primary-action">
                        {totalRevenue.toLocaleString()} MMK
                    </div>
                </div>
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-lg shadow">
                    <div className="text-sm text-text-secondary mb-1">Total Orders</div>
                    <div className="text-2xl font-bold">{revenue.length}</div>
                </div>
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-lg shadow">
                    <div className="text-sm text-text-secondary mb-1">Average Order Value</div>
                    <div className="text-2xl font-bold">
                        {revenue.length > 0 ? (totalRevenue / revenue.length).toLocaleString() : 0} MMK
                    </div>
                </div>
            </div>

            {/* Revenue by Sales Type */}
            <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-lg shadow mb-6">
                <h2 className="text-lg font-semibold mb-4">Revenue by Sales Type</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.values(SalesType).map(type => (
                        <div key={type} className="border border-slate-200 dark:border-slate-700 rounded p-4">
                            <div className="text-sm text-text-secondary mb-1">{type}</div>
                            <div className="text-xl font-bold">
                                {revenueByType[type].toLocaleString()} MMK
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Revenue */}
            <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <h2 className="text-lg font-semibold p-4">Recent Revenue</h2>
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Order #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Sales Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {revenue.slice(0, 50).map(rev => (
                            <tr key={rev.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm">{new Date(rev.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-sm">{rev.orderNumber}</td>
                                <td className="px-4 py-3 text-sm">{rev.salesType}</td>
                                <td className="px-4 py-3 text-sm">{rev.customerType}</td>
                                <td className="px-4 py-3 text-sm font-semibold">{rev.amountMMK.toLocaleString()} MMK</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {revenue.length === 0 && (
                    <p className="text-center text-text-secondary py-8">No revenue data found.</p>
                )}
            </div>
        </div>
    );
};

export default RevenueDashboard;






