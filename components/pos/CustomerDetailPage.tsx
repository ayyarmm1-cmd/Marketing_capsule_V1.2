import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { POSCustomer, POSOrder, POSOrderStatus, SalesType, DeliveryStatus, POSRevenue } from '../../types';
import { 
    apiGetPOSCustomerById, 
    apiGetPOSOrdersByCustomer,
    apiGetPOSRevenueByCustomer,
    apiUpdatePOSCustomer,
    apiDeletePOSCustomer
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';
import { STATUS_COLORS } from '../../constants';

const CustomerDetailPage: React.FC = () => {
    const { customerId } = useParams<{ customerId: string }>();
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    
    const [customer, setCustomer] = useState<POSCustomer | null>(null);
    const [orders, setOrders] = useState<POSOrder[]>([]);
    const [revenue, setRevenue] = useState<POSRevenue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'orders' | 'delivery' | 'revenue'>('details');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
        },
        notes: '',
    });
    const [filters, setFilters] = useState({
        orderStatus: '',
        salesType: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        if (customerId) {
            fetchData();
        }
    }, [customerId, filters]);

    const fetchData = useCallback(async () => {
        if (!customerId) return;
        
        setIsLoading(true);
        try {
            const [fetchedCustomer, fetchedOrders, fetchedRevenue] = await Promise.all([
                apiGetPOSCustomerById(customerId),
                apiGetPOSOrdersByCustomer(customerId),
                apiGetPOSRevenueByCustomer(customerId, filters.startDate || undefined, filters.endDate || undefined),
            ]);
            
            setCustomer(fetchedCustomer);
            setOrders(fetchedOrders);
            setRevenue(fetchedRevenue);
        } catch (error) {
            console.error("Failed to load customer data:", error);
            addNotification("Failed to load customer data.", "error");
        }
        setIsLoading(false);
    }, [customerId, filters.startDate, filters.endDate, addNotification]);

    const filteredOrders = useMemo(() => {
        let filtered = orders;
        
        if (filters.orderStatus) {
            filtered = filtered.filter(o => o.status === filters.orderStatus);
        }
        if (filters.salesType) {
            filtered = filtered.filter(o => o.salesType === filters.salesType);
        }
        
        return filtered;
    }, [orders, filters]);

    const totalRevenue = useMemo(() => {
        return revenue.reduce((sum, r) => sum + r.amountMMK, 0);
    }, [revenue]);

    const totalOrders = useMemo(() => {
        return orders.length;
    }, [orders]);

    const pendingDeliveries = useMemo(() => {
        return orders.filter(o => 
            o.deliveryTracking && 
            o.deliveryTracking.status !== DeliveryStatus.DELIVERED &&
            o.deliveryTracking.status !== DeliveryStatus.CANCELLED
        ).length;
    }, [orders]);

    const handleEdit = () => {
        if (customer) {
            setEditFormData({
                name: customer.name,
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: '',
                },
                notes: customer.notes || '',
            });
            setIsEditModalOpen(true);
        }
    };

    const handleSaveEdit = async () => {
        if (!customer) return;
        
        try {
            await apiUpdatePOSCustomer({
                id: customer.id,
                ...editFormData,
            });
            addNotification("Customer updated successfully!", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to update customer: ${errorMessage}`, "error");
        }
    };

    const handleDelete = async () => {
        if (!customer) return;
        
        const confirmed = await showConfirmation(
            "Delete Customer",
            `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await apiDeletePOSCustomer(customer.id);
            addNotification("Customer deleted successfully!", "success");
            window.location.href = '/pos/sales';
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to delete customer: ${errorMessage}`, "error");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="text-center text-text-primary p-8">
                Customer not found.
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-container-bg dark:bg-slate-800 shadow-lg rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100">{customer.name}</h1>
                        <p className="text-md text-text-secondary dark:text-slate-400">POS Customer - ID: {customer.id}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {hasPermission('MANAGE_POS_ORDERS' as any) && (
                            <>
                                <Button onClick={handleEdit} variant="secondary" size="sm">Edit</Button>
                                <Button onClick={handleDelete} variant="danger" size="sm">Delete</Button>
                            </>
                        )}
                        <Link to="/pos/sales" className="text-primary-action hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                            &larr; Back to POS
                        </Link>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-lg shadow">
                    <div className="text-sm text-text-secondary mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold text-primary-action">
                        {totalRevenue.toLocaleString()} MMK
                    </div>
                </div>
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-lg shadow">
                    <div className="text-sm text-text-secondary mb-1">Total Orders</div>
                    <div className="text-2xl font-bold">{totalOrders}</div>
                </div>
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-lg shadow">
                    <div className="text-sm text-text-secondary mb-1">Pending Deliveries</div>
                    <div className="text-2xl font-bold">{pendingDeliveries}</div>
                </div>
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-lg shadow">
                    <div className="text-sm text-text-secondary mb-1">Average Order Value</div>
                    <div className="text-2xl font-bold">
                        {totalOrders > 0 ? (totalRevenue / totalOrders).toLocaleString() : 0} MMK
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-container-bg dark:bg-slate-800 shadow-lg rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'details'
                                    ? 'border-primary-action text-primary-action'
                                    : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                            }`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'orders'
                                    ? 'border-primary-action text-primary-action'
                                    : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                            }`}
                        >
                            Orders ({orders.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('delivery')}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'delivery'
                                    ? 'border-primary-action text-primary-action'
                                    : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                            }`}
                        >
                            Delivery Tracking ({pendingDeliveries})
                        </button>
                        <button
                            onClick={() => setActiveTab('revenue')}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'revenue'
                                    ? 'border-primary-action text-primary-action'
                                    : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                            }`}
                        >
                            Revenue History
                        </button>
                    </nav>
                </div>

                <div className="min-h-[200px]">
                    {/* Details Tab */}
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Name</label>
                                    <div className="text-text-primary dark:text-slate-100">{customer.name}</div>
                                </div>
                                {customer.email && (
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Email</label>
                                        <div className="text-text-primary dark:text-slate-100">{customer.email}</div>
                                    </div>
                                )}
                                {customer.phone && (
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Phone</label>
                                        <div className="text-text-primary dark:text-slate-100">{customer.phone}</div>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Address</label>
                                        <div className="text-text-primary dark:text-slate-100">
                                            {[
                                                customer.address.street,
                                                customer.address.city,
                                                customer.address.state,
                                                customer.address.zipCode,
                                                customer.address.country
                                            ].filter(Boolean).join(', ')}
                                        </div>
                                    </div>
                                )}
                                {customer.notes && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Notes</label>
                                        <div className="text-text-primary dark:text-slate-100">{customer.notes}</div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Created</label>
                                    <div className="text-text-primary dark:text-slate-100">
                                        {new Date(customer.createdAt).toLocaleDateString('en-GB')}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Updated</label>
                                    <div className="text-text-primary dark:text-slate-100">
                                        {new Date(customer.updatedAt).toLocaleDateString('en-GB')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div>
                            {/* Filters */}
                            <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Select
                                        label="Status"
                                        value={filters.orderStatus}
                                        onChange={(e) => setFilters({ ...filters, orderStatus: e.target.value })}
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
                                            ...Object.values(SalesType).map(s => ({ value: s, label: s }))
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

                            {/* Orders Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Order #</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Sales Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Items</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Total</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {filteredOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 text-sm font-medium">{order.orderNumber}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {new Date(order.createdAt).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{order.salesType}</td>
                                                <td className="px-4 py-3 text-sm">{order.items.length}</td>
                                                <td className="px-4 py-3 text-sm font-semibold">
                                                    {order.grandTotalMMK.toLocaleString()} MMK
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <Link
                                                        to={`/pos/orders/${order.id}`}
                                                        className="text-primary-action hover:text-blue-700 dark:text-blue-400"
                                                    >
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredOrders.length === 0 && (
                                    <p className="text-center text-text-secondary py-8">No orders found.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Delivery Tracking Tab */}
                    {activeTab === 'delivery' && (
                        <div>
                            {orders.filter(o => o.deliveryTracking).length === 0 ? (
                                <p className="text-text-secondary">No delivery tracking information available.</p>
                            ) : (
                                <div className="space-y-4">
                                    {orders
                                        .filter(o => o.deliveryTracking)
                                        .map(order => (
                                            <div
                                                key={order.id}
                                                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="font-semibold text-text-primary dark:text-slate-100">
                                                            Order #{order.orderNumber}
                                                        </div>
                                                        <div className="text-sm text-text-secondary">
                                                            {new Date(order.createdAt).toLocaleDateString('en-GB')}
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                                        order.deliveryTracking!.status === DeliveryStatus.DELIVERED
                                                            ? 'bg-green-100 text-green-700'
                                                            : order.deliveryTracking!.status === DeliveryStatus.CANCELLED
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {order.deliveryTracking!.status}
                                                    </span>
                                                </div>
                                                {order.deliveryTracking!.trackingNumber && (
                                                    <div className="mb-2">
                                                        <span className="text-sm font-medium">Tracking #: </span>
                                                        <span className="text-sm">{order.deliveryTracking!.trackingNumber}</span>
                                                    </div>
                                                )}
                                                {order.deliveryTracking!.carrier && (
                                                    <div className="mb-2">
                                                        <span className="text-sm font-medium">Carrier: </span>
                                                        <span className="text-sm">{order.deliveryTracking!.carrier}</span>
                                                    </div>
                                                )}
                                                {order.deliveryTracking!.estimatedDeliveryDate && (
                                                    <div className="mb-2">
                                                        <span className="text-sm font-medium">Estimated Delivery: </span>
                                                        <span className="text-sm">
                                                            {new Date(order.deliveryTracking!.estimatedDeliveryDate).toLocaleDateString('en-GB')}
                                                        </span>
                                                    </div>
                                                )}
                                                {order.deliveryTracking!.deliveryAddress && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                        <div className="text-sm font-medium mb-1">Delivery Address:</div>
                                                        <div className="text-sm text-text-secondary">
                                                            {[
                                                                order.deliveryTracking!.deliveryAddress.street,
                                                                order.deliveryTracking!.deliveryAddress.city,
                                                                order.deliveryTracking!.deliveryAddress.state,
                                                                order.deliveryTracking!.deliveryAddress.zipCode,
                                                                order.deliveryTracking!.deliveryAddress.country
                                                            ].filter(Boolean).join(', ')}
                                                        </div>
                                                        {order.deliveryTracking!.deliveryAddress.contactName && (
                                                            <div className="text-sm text-text-secondary mt-1">
                                                                Contact: {order.deliveryTracking!.deliveryAddress.contactName}
                                                                {order.deliveryTracking!.deliveryAddress.contactPhone && 
                                                                    ` - ${order.deliveryTracking!.deliveryAddress.contactPhone}`
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Revenue Tab */}
                    {activeTab === 'revenue' && (
                        <div>
                            <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Order #</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Sales Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {revenue.map(rev => (
                                            <tr key={rev.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 text-sm">
                                                    {new Date(rev.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium">{rev.orderNumber}</td>
                                                <td className="px-4 py-3 text-sm">{rev.salesType}</td>
                                                <td className="px-4 py-3 text-sm font-semibold">
                                                    {rev.amountMMK.toLocaleString()} MMK
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {revenue.length === 0 && (
                                    <p className="text-center text-text-secondary py-8">No revenue records found.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title="Edit Customer"
                >
                    <div className="space-y-4">
                        <Input
                            label="Name *"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        />
                        <Input
                            label="Phone"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        />
                        <Input
                            label="Street"
                            value={editFormData.address.street}
                            onChange={(e) => setEditFormData({
                                ...editFormData,
                                address: { ...editFormData.address, street: e.target.value }
                            })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="City"
                                value={editFormData.address.city}
                                onChange={(e) => setEditFormData({
                                    ...editFormData,
                                    address: { ...editFormData.address, city: e.target.value }
                                })}
                            />
                            <Input
                                label="State"
                                value={editFormData.address.state}
                                onChange={(e) => setEditFormData({
                                    ...editFormData,
                                    address: { ...editFormData.address, state: e.target.value }
                                })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Zip Code"
                                value={editFormData.address.zipCode}
                                onChange={(e) => setEditFormData({
                                    ...editFormData,
                                    address: { ...editFormData.address, zipCode: e.target.value }
                                })}
                            />
                            <Input
                                label="Country"
                                value={editFormData.address.country}
                                onChange={(e) => setEditFormData({
                                    ...editFormData,
                                    address: { ...editFormData.address, country: e.target.value }
                                })}
                            />
                        </div>
                        <Input
                            label="Notes"
                            as="textarea"
                            rows={3}
                            value={editFormData.notes}
                            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSaveEdit}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CustomerDetailPage;






