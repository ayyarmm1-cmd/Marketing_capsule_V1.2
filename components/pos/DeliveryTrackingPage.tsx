import React, { useState, useEffect, useCallback } from 'react';
import { POSOrder, DeliveryStatus } from '../../types';
import { apiGetPOSOrders, apiUpdateDeliveryStatus, apiGetOrdersByDeliveryStatus } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';

const DeliveryTrackingPage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [orders, setOrders] = useState<POSOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<DeliveryStatus | ''>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<POSOrder | null>(null);

    const [formData, setFormData] = useState({
        status: DeliveryStatus.PENDING,
        trackingNumber: '',
        carrier: '',
        estimatedDeliveryDate: '',
        actualDeliveryDate: '',
        deliveryAddress: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            contactName: '',
            contactPhone: '',
        },
        notes: '',
    });

    useEffect(() => {
        fetchData();
    }, [selectedStatus]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedOrders = selectedStatus
                ? await apiGetOrdersByDeliveryStatus(selectedStatus as DeliveryStatus)
                : await apiGetPOSOrders();
            setOrders(fetchedOrders.filter(o => o.deliveryTracking));
        } catch (error) {
            console.error("Failed to load orders:", error);
            addNotification("Failed to load orders.", "error");
        }
        setIsLoading(false);
    }, [selectedStatus, addNotification]);

    const handleOpenModal = (order: POSOrder) => {
        setSelectedOrder(order);
        const tracking = order.deliveryTracking;
        if (tracking) {
            setFormData({
                status: tracking.status,
                trackingNumber: tracking.trackingNumber || '',
                carrier: tracking.carrier || '',
                estimatedDeliveryDate: tracking.estimatedDeliveryDate || '',
                actualDeliveryDate: tracking.actualDeliveryDate || '',
                deliveryAddress: tracking.deliveryAddress,
                notes: tracking.notes || '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedOrder || !user) return;

        try {
            await apiUpdateDeliveryStatus(
                selectedOrder.id,
                formData.status,
                {
                    trackingNumber: formData.trackingNumber || undefined,
                    carrier: formData.carrier || undefined,
                    estimatedDeliveryDate: formData.estimatedDeliveryDate || undefined,
                    actualDeliveryDate: formData.actualDeliveryDate || undefined,
                    deliveryAddress: formData.deliveryAddress,
                    notes: formData.notes || undefined,
                },
                user.id
            );
            addNotification("Delivery status updated successfully!", "success");
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to update delivery status: ${errorMessage}`, "error");
        }
    };

    const ordersByStatus = orders.reduce((acc, order) => {
        const status = order.deliveryTracking?.status || DeliveryStatus.PENDING;
        if (!acc[status]) acc[status] = [];
        acc[status].push(order);
        return acc;
    }, {} as Record<DeliveryStatus, POSOrder[]>);

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
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Delivery Tracking</h1>
                <Select
                    label="Filter by Status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as DeliveryStatus | '')}
                    options={[
                        { value: '', label: 'All Statuses' },
                        ...Object.values(DeliveryStatus).map(s => ({ value: s, label: s }))
                    ]}
                    containerClassName="mb-0 w-64"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(DeliveryStatus).map(status => {
                    const statusOrders = ordersByStatus[status] || [];
                    return (
                        <div key={status} className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow">
                            <h2 className="text-lg font-semibold mb-4">{status} ({statusOrders.length})</h2>
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {statusOrders.map(order => (
                                    <div
                                        key={order.id}
                                        className="border border-slate-200 dark:border-slate-700 rounded p-3 hover:shadow-md cursor-pointer"
                                        onClick={() => handleOpenModal(order)}
                                    >
                                        <div className="font-semibold text-sm">{order.orderNumber}</div>
                                        <div className="text-xs text-text-secondary">{order.customerName}</div>
                                        <div className="text-xs text-text-secondary mt-1">
                                            {order.deliveryTracking?.trackingNumber && (
                                                <div>Tracking: {order.deliveryTracking.trackingNumber}</div>
                                            )}
                                            {order.deliveryTracking?.carrier && (
                                                <div>Carrier: {order.deliveryTracking.carrier}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {statusOrders.length === 0 && (
                                    <p className="text-center text-text-secondary text-sm py-4">No orders</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && selectedOrder && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={`Update Delivery - ${selectedOrder.orderNumber}`}
                >
                    <div className="space-y-4">
                        <Select
                            label="Status *"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as DeliveryStatus })}
                            options={Object.values(DeliveryStatus).map(s => ({ value: s, label: s }))}
                        />
                        <Input
                            label="Tracking Number"
                            value={formData.trackingNumber}
                            onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                        />
                        <Input
                            label="Carrier"
                            value={formData.carrier}
                            onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                        />
                        <Input
                            label="Estimated Delivery Date"
                            type="date"
                            value={formData.estimatedDeliveryDate}
                            onChange={(e) => setFormData({ ...formData, estimatedDeliveryDate: e.target.value })}
                        />
                        <Input
                            label="Actual Delivery Date"
                            type="date"
                            value={formData.actualDeliveryDate}
                            onChange={(e) => setFormData({ ...formData, actualDeliveryDate: e.target.value })}
                        />
                        <div>
                            <h3 className="font-semibold mb-2">Delivery Address</h3>
                            <div className="space-y-2">
                                <Input
                                    label="Street"
                                    value={formData.deliveryAddress.street}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        deliveryAddress: { ...formData.deliveryAddress, street: e.target.value }
                                    })}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        label="City"
                                        value={formData.deliveryAddress.city}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            deliveryAddress: { ...formData.deliveryAddress, city: e.target.value }
                                        })}
                                    />
                                    <Input
                                        label="Country"
                                        value={formData.deliveryAddress.country}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            deliveryAddress: { ...formData.deliveryAddress, country: e.target.value }
                                        })}
                                    />
                                </div>
                                <Input
                                    label="Contact Name"
                                    value={formData.deliveryAddress.contactName}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        deliveryAddress: { ...formData.deliveryAddress, contactName: e.target.value }
                                    })}
                                />
                                <Input
                                    label="Contact Phone"
                                    value={formData.deliveryAddress.contactPhone}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        deliveryAddress: { ...formData.deliveryAddress, contactPhone: e.target.value }
                                    })}
                                />
                            </div>
                        </div>
                        <Input
                            label="Notes"
                            as="textarea"
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSubmit}>Update</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DeliveryTrackingPage;






