import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { POSOrder, POSOrderStatus, SalesType } from '../../types';
import { apiGetPOSOrders } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { STATUS_COLORS } from '../../constants';

const OrdersManagementPage: React.FC = () => {
    const { addNotification } = useNotification();
    const [orders, setOrders] = useState<POSOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        salesType: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedOrders = await apiGetPOSOrders({
                status: filters.status as POSOrderStatus || undefined,
                salesType: filters.salesType as SalesType || undefined,
                startDate: filters.startDate || undefined,
                endDate: filters.endDate || undefined,
            });
            setOrders(fetchedOrders);
        } catch (error) {
            console.error("Failed to load orders:", error);
            addNotification("Failed to load orders.", "error");
        }
        setIsLoading(false);
    }, [filters, addNotification]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Orders Management</h1>
            </div>

            <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select
                        label="Status"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        options={[
                            { value: '', label: 'All Statuses' },
                            ...Object.values(POSOrderStatus).map(s => ({ value: s, label: s }))
                        ]}
                        containerClassName="mb-0"
                    />
                    <Select
                        label="Sales Type"
                        value={filters.salesType}
                        onChange={(e) => setFilters({ ...filters, salesType: e.target.value })}
                        options={[
                            { value: '', label: 'All Types' },
                            ...Object.values(SalesType).map(st => ({ value: st, label: st }))
                        ]}
                        containerClassName="mb-0"
                    />
                    <Input
                        label="Start Date"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        containerClassName="mb-0"
                    />
                    <Input
                        label="End Date"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        containerClassName="mb-0"
                    />
                </div>
            </div>

            <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Order #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Sales Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm">
                                    <Link to={`/pos/orders/${order.id}`} className="text-primary-action hover:underline">
                                        {order.orderNumber}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-sm">{order.customerName}</td>
                                <td className="px-4 py-3 text-sm">{order.salesType}</td>
                                <td className="px-4 py-3 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold">{order.grandTotalMMK.toLocaleString()} MMK</td>
                                <td className="px-4 py-3 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-sm">
                                    <Link to={`/pos/orders/${order.id}`}>
                                        <Button size="sm" variant="ghost">View</Button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders.length === 0 && (
                    <p className="text-center text-text-secondary py-8">No orders found.</p>
                )}
            </div>
        </div>
    );
};

export default OrdersManagementPage;






