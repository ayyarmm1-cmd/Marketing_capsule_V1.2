import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { POSOrder, POSOrderStatus, SalesType, DeliveryStatus, DeliveryTracking, CompanyProfileSetting } from '../../types';
import { 
    apiGetPOSOrderById,
    apiUpdatePOSOrder,
    apiCancelPOSOrder,
    apiGetCompanyProfile
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
import { formatDateForDisplay } from '../../utils/dateUtils';
import POSOrderPDFTemplate from './POSOrderPDFTemplate';

const OrderDetailPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    
    const [order, setOrder] = useState<POSOrder | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'delivery' | 'payment'>('overview');
    const pdfTemplateRef = useRef<HTMLDivElement>(null);
    
    // Status update modal
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<POSOrderStatus>(POSOrderStatus.PENDING);
    
    // Delivery tracking modal
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [deliveryFormData, setDeliveryFormData] = useState({
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

    const fetchData = useCallback(async () => {
        if (!orderId) return;
        
        setIsLoading(true);
        try {
            const [fetchedOrder, profile] = await Promise.all([
                apiGetPOSOrderById(orderId),
                apiGetCompanyProfile(),
            ]);
            setOrder(fetchedOrder);
            setCompanyProfile(profile);
            
            if (fetchedOrder) {
                setNewStatus(fetchedOrder.status);
                if (fetchedOrder.deliveryTracking) {
                    setDeliveryFormData({
                        status: fetchedOrder.deliveryTracking.status,
                        trackingNumber: fetchedOrder.deliveryTracking.trackingNumber || '',
                        carrier: fetchedOrder.deliveryTracking.carrier || '',
                        estimatedDeliveryDate: fetchedOrder.deliveryTracking.estimatedDeliveryDate || '',
                        actualDeliveryDate: fetchedOrder.deliveryTracking.actualDeliveryDate || '',
                        deliveryAddress: fetchedOrder.deliveryTracking.deliveryAddress,
                        notes: fetchedOrder.deliveryTracking.notes || '',
                    });
                }
            }
        } catch (error) {
            console.error("Failed to load order data:", error);
            addNotification("Failed to load order data.", "error");
        }
        setIsLoading(false);
    }, [orderId, addNotification]);

    const handleUpdateStatus = async () => {
        if (!order || !user) return;
        
        try {
            await apiUpdatePOSOrder({
                id: order.id,
                status: newStatus,
            });
            addNotification("Order status updated successfully!", "success");
            setIsStatusModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to update status: ${errorMessage}`, "error");
        }
    };

    const handleCancelOrder = async () => {
        if (!order || !user) return;
        
        const confirmed = await showConfirmation(
            "Cancel Order",
            `Are you sure you want to cancel order ${order.orderNumber}? This will restore inventory.`
        );
        if (!confirmed) return;

        try {
            await apiCancelPOSOrder(order.id, user.id);
            addNotification("Order cancelled successfully!", "success");
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to cancel order: ${errorMessage}`, "error");
        }
    };

    const handleUpdateDelivery = async () => {
        if (!order || !user) return;
        
        try {
            const deliveryTracking: DeliveryTracking = {
                orderId: order.id,
                status: deliveryFormData.status,
                trackingNumber: deliveryFormData.trackingNumber || undefined,
                carrier: deliveryFormData.carrier || undefined,
                estimatedDeliveryDate: deliveryFormData.estimatedDeliveryDate || undefined,
                actualDeliveryDate: deliveryFormData.actualDeliveryDate || undefined,
                deliveryAddress: deliveryFormData.deliveryAddress,
                notes: deliveryFormData.notes || undefined,
                updatedAt: new Date().toISOString(),
                updatedBy: user.id,
            };
            
            await apiUpdatePOSOrder({
                id: order.id,
                deliveryTracking,
            });
            addNotification("Delivery information updated successfully!", "success");
            setIsDeliveryModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to update delivery: ${errorMessage}`, "error");
        }
    };

    const handleOpenDeliveryModal = () => {
        if (order?.deliveryTracking) {
            setDeliveryFormData({
                status: order.deliveryTracking.status,
                trackingNumber: order.deliveryTracking.trackingNumber || '',
                carrier: order.deliveryTracking.carrier || '',
                estimatedDeliveryDate: order.deliveryTracking.estimatedDeliveryDate || '',
                actualDeliveryDate: order.deliveryTracking.actualDeliveryDate || '',
                deliveryAddress: order.deliveryTracking.deliveryAddress,
                notes: order.deliveryTracking.notes || '',
            });
        }
        setIsDeliveryModalOpen(true);
    };


    const handleQuickDeliveryStatusChange = async (newStatus: DeliveryStatus) => {
        if (!order || !user) return;
        
        try {
            const deliveryTracking: DeliveryTracking = {
                orderId: order.id,
                status: newStatus,
                trackingNumber: order.deliveryTracking?.trackingNumber,
                carrier: order.deliveryTracking?.carrier,
                estimatedDeliveryDate: order.deliveryTracking?.estimatedDeliveryDate,
                actualDeliveryDate: newStatus === DeliveryStatus.DELIVERED ? new Date().toISOString() : order.deliveryTracking?.actualDeliveryDate,
                deliveryAddress: order.deliveryTracking?.deliveryAddress || {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: '',
                    contactName: '',
                    contactPhone: '',
                },
                notes: order.deliveryTracking?.notes,
                updatedAt: new Date().toISOString(),
                updatedBy: user.id,
            };
            
            await apiUpdatePOSOrder({
                id: order.id,
                deliveryTracking,
            });
            addNotification(`Delivery status updated to ${newStatus}!`, "success");
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to update delivery status: ${errorMessage}`, "error");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <p className="text-text-secondary mb-4">Order not found.</p>
                    <Link to="/pos/orders">
                        <Button variant="primary">Back to Orders</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const canCancel = order.status !== POSOrderStatus.CANCELLED && 
                     order.status !== POSOrderStatus.DELIVERED && 
                     order.status !== POSOrderStatus.REFUNDED;

    const canUpdateStatus = hasPermission('MANAGE_POS_ORDERS' as any);
    const canUpdateDelivery = hasPermission('MANAGE_POS_ORDERS' as any);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/pos/orders">
                        <Button variant="ghost" size="sm">← Back</Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">
                            Order {order.orderNumber}
                        </h1>
                        <p className="text-text-secondary mt-1">
                            Created: {new Date(order.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="primary" onClick={handlePrint}>
                        Print Order
                    </Button>
                    {canUpdateStatus && (
                        <Button variant="secondary" onClick={() => setIsStatusModalOpen(true)}>
                            Update Status
                        </Button>
                    )}
                    {canUpdateDelivery && (
                        <Button variant="secondary" onClick={handleOpenDeliveryModal}>
                            {order.deliveryTracking ? 'Update Delivery' : 'Add Delivery'}
                        </Button>
                    )}
                    {canCancel && hasPermission('MANAGE_POS_ORDERS' as any) && (
                        <Button variant="danger" onClick={handleCancelOrder}>
                            Cancel Order
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary">Grand Total</div>
                    <div className="text-2xl font-bold mt-1">{order.grandTotalMMK.toLocaleString()}</div>
                    <div className="text-xs text-text-secondary mt-1">MMK</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary">Amount Paid</div>
                    <div className="text-2xl font-bold mt-1">{order.amountPaidMMK.toLocaleString()}</div>
                    <div className="text-xs text-text-secondary mt-1">MMK</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary">Balance</div>
                    <div className={`text-2xl font-bold mt-1 ${(order.grandTotalMMK - order.amountPaidMMK) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(order.grandTotalMMK - order.amountPaidMMK).toLocaleString()}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">MMK</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary">Items</div>
                    <div className="text-2xl font-bold mt-1">{order.items.length}</div>
                    <div className="text-xs text-text-secondary mt-1">products</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow mb-6">
                <div className="border-b border-gray-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        {(['overview', 'items', 'delivery', 'payment'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab
                                        ? 'border-primary-action text-primary-action'
                                        : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Order Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Order Information</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-sm text-text-secondary">Order Number</div>
                                            <div className="font-medium">{order.orderNumber}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-text-secondary">Status</div>
                                            <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-200'}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        {order.isPrinted && (
                                            <div>
                                                <div className="text-sm text-text-secondary dark:text-slate-400">Printed Status</div>
                                                <span className="px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                                    Printed {order.printedAt ? `on ${formatDateForDisplay(order.printedAt)}` : ''}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-sm text-text-secondary">Sales Type</div>
                                            <div className="font-medium">{order.salesType}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-text-secondary">Created</div>
                                            <div className="font-medium">{new Date(order.createdAt).toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-text-secondary">Last Updated</div>
                                            <div className="font-medium">{new Date(order.updatedAt).toLocaleString()}</div>
                                        </div>
                                        {order.notes && (
                                            <div>
                                                <div className="text-sm text-text-secondary">Notes</div>
                                                <div className="font-medium">{order.notes}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Customer Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-sm text-text-secondary">Customer Name</div>
                                            {order.customerId ? (
                                                <Link 
                                                    to={`/pos/customers/${order.customerId}`}
                                                    className="font-medium text-primary-action hover:underline"
                                                >
                                                    {order.customerName}
                                                </Link>
                                            ) : (
                                                <div className="font-medium">{order.customerName}</div>
                                            )}
                                        </div>
                                        {order.customerId && (
                                            <Link to={`/pos/customers/${order.customerId}`}>
                                                <Button size="sm" variant="secondary">View Customer Details</Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Financial Summary</h3>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Subtotal</span>
                                        <span className="font-medium">{order.subtotalMMK.toLocaleString()} MMK</span>
                                    </div>
                                    {order.discountMMK && order.discountMMK > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>Discount {order.discountDescription && `(${order.discountDescription})`}</span>
                                            <span>-{order.discountMMK.toLocaleString()} MMK</span>
                                        </div>
                                    )}
                                    {order.taxAmountMMK && order.taxAmountMMK > 0 && (
                                        <div className="flex justify-between">
                                            <span>Tax {order.taxPercentage && `(${order.taxPercentage}%)`}</span>
                                            <span>{order.taxAmountMMK.toLocaleString()} MMK</span>
                                        </div>
                                    )}
                                    {order.shippingCostMMK && order.shippingCostMMK > 0 && (
                                        <div className="flex justify-between">
                                            <span>Shipping</span>
                                            <span>{order.shippingCostMMK.toLocaleString()} MMK</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="font-semibold">Grand Total</span>
                                        <span className="font-semibold text-lg">{order.grandTotalMMK.toLocaleString()} MMK</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="font-semibold">Amount Paid</span>
                                        <span className="font-semibold">{order.amountPaidMMK.toLocaleString()} MMK</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={`font-semibold ${(order.grandTotalMMK - order.amountPaidMMK) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            Balance
                                        </span>
                                        <span className={`font-semibold ${(order.grandTotalMMK - order.amountPaidMMK) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {(order.grandTotalMMK - order.amountPaidMMK).toLocaleString()} MMK
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Items Tab */}
                    {activeTab === 'items' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Order Items</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Product</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Variant</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">SKU</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Quantity</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Unit Price</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Discount</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Tax</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {order.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 text-sm">
                                                    <Link 
                                                        to={`/pos/products/${item.productId}`}
                                                        className="font-medium text-primary-action hover:underline"
                                                    >
                                                        {item.productName}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{item.variantName || 'N/A'}</td>
                                                <td className="px-4 py-3 text-sm">{item.productSku}</td>
                                                <td className="px-4 py-3 text-sm">{item.quantity}</td>
                                                <td className="px-4 py-3 text-sm">{item.unitPriceMMK.toLocaleString()} MMK</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {item.discountMMK ? `-${item.discountMMK.toLocaleString()} MMK` : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {item.taxAmountMMK ? `${item.taxAmountMMK.toLocaleString()} MMK` : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold">{item.subtotalMMK.toLocaleString()} MMK</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-100 dark:bg-slate-700/50">
                                        <tr>
                                            <td colSpan={7} className="px-4 py-3 text-sm font-semibold text-right">Total</td>
                                            <td className="px-4 py-3 text-sm font-semibold">{order.grandTotalMMK.toLocaleString()} MMK</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Delivery Tab */}
                    {activeTab === 'delivery' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Delivery Information</h3>
                                <div className="flex gap-2">
                                    {order.deliveryTracking && (
                                        <div className="flex flex-wrap gap-1">
                                            {Object.values(DeliveryStatus).map(status => (
                                                <Button
                                                    key={status}
                                                    variant={order.deliveryTracking?.status === status ? 'primary' : 'secondary'}
                                                    size="sm"
                                                    onClick={() => handleQuickDeliveryStatusChange(status)}
                                                    disabled={order.deliveryTracking?.status === status}
                                                >
                                                    {status}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                    {canUpdateDelivery && (
                                        <Button variant="secondary" onClick={handleOpenDeliveryModal}>
                                            {order.deliveryTracking ? 'Update Delivery' : 'Add Delivery Info'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {order.deliveryTracking ? (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-4">
                                    <div>
                                        <div className="text-sm text-text-secondary">Delivery Status</div>
                                        <div className="font-medium mt-1">{order.deliveryTracking.status}</div>
                                    </div>
                                    {order.deliveryTracking.trackingNumber && (
                                        <div>
                                            <div className="text-sm text-text-secondary">Tracking Number</div>
                                            <div className="font-medium mt-1">{order.deliveryTracking.trackingNumber}</div>
                                        </div>
                                    )}
                                    {order.deliveryTracking.carrier && (
                                        <div>
                                            <div className="text-sm text-text-secondary">Carrier</div>
                                            <div className="font-medium mt-1">{order.deliveryTracking.carrier}</div>
                                        </div>
                                    )}
                                    {order.deliveryTracking.estimatedDeliveryDate && (
                                        <div>
                                            <div className="text-sm text-text-secondary">Estimated Delivery</div>
                                            <div className="font-medium mt-1">
                                                {formatDateForDisplay(order.deliveryTracking.estimatedDeliveryDate)}
                                            </div>
                                        </div>
                                    )}
                                    {order.deliveryTracking.actualDeliveryDate && (
                                        <div>
                                            <div className="text-sm text-text-secondary">Actual Delivery</div>
                                            <div className="font-medium mt-1">
                                                {formatDateForDisplay(order.deliveryTracking.actualDeliveryDate)}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm text-text-secondary mb-2">Delivery Address</div>
                                        <div className="font-medium">
                                            {order.deliveryTracking.deliveryAddress.street}<br />
                                            {order.deliveryTracking.deliveryAddress.city}
                                            {order.deliveryTracking.deliveryAddress.state && `, ${order.deliveryTracking.deliveryAddress.state}`}
                                            {order.deliveryTracking.deliveryAddress.zipCode && ` ${order.deliveryTracking.deliveryAddress.zipCode}`}<br />
                                            {order.deliveryTracking.deliveryAddress.country}
                                        </div>
                                        {order.deliveryTracking.deliveryAddress.contactName && (
                                            <div className="text-sm text-text-secondary mt-2">
                                                Contact: {order.deliveryTracking.deliveryAddress.contactName}
                                                {order.deliveryTracking.deliveryAddress.contactPhone && ` - ${order.deliveryTracking.deliveryAddress.contactPhone}`}
                                            </div>
                                        )}
                                    </div>
                                    {order.deliveryTracking.notes && (
                                        <div>
                                            <div className="text-sm text-text-secondary">Notes</div>
                                            <div className="font-medium mt-1">{order.deliveryTracking.notes}</div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm text-text-secondary">Last Updated</div>
                                        <div className="font-medium mt-1">
                                            {new Date(order.deliveryTracking.updatedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded">
                                    <p className="text-text-secondary mb-4">No delivery information added yet.</p>
                                    {canUpdateDelivery && (
                                        <Button variant="primary" onClick={handleOpenDeliveryModal}>
                                            Add Delivery Information
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Tab */}
                    {activeTab === 'payment' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Payment Information</h3>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-4">
                                <div>
                                    <div className="text-sm text-text-secondary">Payment Method</div>
                                    <div className="font-medium mt-1">{order.paymentMethod || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-text-secondary">Amount Paid</div>
                                    <div className="font-medium text-lg mt-1">{order.amountPaidMMK.toLocaleString()} MMK</div>
                                </div>
                                <div>
                                    <div className="text-sm text-text-secondary">Grand Total</div>
                                    <div className="font-medium text-lg mt-1">{order.grandTotalMMK.toLocaleString()} MMK</div>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="text-sm text-text-secondary">Balance</div>
                                    <div className={`font-medium text-lg mt-1 ${(order.grandTotalMMK - order.amountPaidMMK) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {(order.grandTotalMMK - order.amountPaidMMK).toLocaleString()} MMK
                                    </div>
                                    {(order.grandTotalMMK - order.amountPaidMMK) > 0 && (
                                        <div className="text-xs text-text-secondary mt-1">Outstanding balance</div>
                                    )}
                                    {(order.grandTotalMMK - order.amountPaidMMK) === 0 && (
                                        <div className="text-xs text-green-600 mt-1">Fully paid</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Update Modal */}
            {isStatusModalOpen && (
                <Modal
                    isOpen={isStatusModalOpen}
                    onClose={() => setIsStatusModalOpen(false)}
                    title="Update Order Status"
                >
                    <div className="space-y-4">
                        <Select
                            label="New Status *"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as POSOrderStatus)}
                            options={Object.values(POSOrderStatus).map(status => ({ value: status, label: status }))}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdateStatus}>Update Status</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delivery Tracking Modal */}
            {isDeliveryModalOpen && (
                <Modal
                    isOpen={isDeliveryModalOpen}
                    onClose={() => setIsDeliveryModalOpen(false)}
                    title={order.deliveryTracking ? 'Update Delivery Information' : 'Add Delivery Information'}
                >
                    <div className="space-y-4">
                        <Select
                            label="Delivery Status *"
                            value={deliveryFormData.status}
                            onChange={(e) => setDeliveryFormData({ ...deliveryFormData, status: e.target.value as DeliveryStatus })}
                            options={Object.values(DeliveryStatus).map(status => ({ value: status, label: status }))}
                        />
                        <Input
                            label="Tracking Number"
                            value={deliveryFormData.trackingNumber}
                            onChange={(e) => setDeliveryFormData({ ...deliveryFormData, trackingNumber: e.target.value })}
                        />
                        <Input
                            label="Carrier"
                            value={deliveryFormData.carrier}
                            onChange={(e) => setDeliveryFormData({ ...deliveryFormData, carrier: e.target.value })}
                            placeholder="e.g., DHL, FedEx, Local Courier"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Estimated Delivery Date"
                                type="date"
                                value={deliveryFormData.estimatedDeliveryDate}
                                onChange={(e) => setDeliveryFormData({ ...deliveryFormData, estimatedDeliveryDate: e.target.value })}
                            />
                            <Input
                                label="Actual Delivery Date"
                                type="date"
                                value={deliveryFormData.actualDeliveryDate}
                                onChange={(e) => setDeliveryFormData({ ...deliveryFormData, actualDeliveryDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <div className="text-sm font-medium mb-2">Delivery Address *</div>
                            <Input
                                label="Street"
                                value={deliveryFormData.deliveryAddress.street}
                                onChange={(e) => setDeliveryFormData({
                                    ...deliveryFormData,
                                    deliveryAddress: { ...deliveryFormData.deliveryAddress, street: e.target.value }
                                })}
                            />
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <Input
                                    label="City"
                                    value={deliveryFormData.deliveryAddress.city}
                                    onChange={(e) => setDeliveryFormData({
                                        ...deliveryFormData,
                                        deliveryAddress: { ...deliveryFormData.deliveryAddress, city: e.target.value }
                                    })}
                                />
                                <Input
                                    label="State"
                                    value={deliveryFormData.deliveryAddress.state}
                                    onChange={(e) => setDeliveryFormData({
                                        ...deliveryFormData,
                                        deliveryAddress: { ...deliveryFormData.deliveryAddress, state: e.target.value }
                                    })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <Input
                                    label="Zip Code"
                                    value={deliveryFormData.deliveryAddress.zipCode}
                                    onChange={(e) => setDeliveryFormData({
                                        ...deliveryFormData,
                                        deliveryAddress: { ...deliveryFormData.deliveryAddress, zipCode: e.target.value }
                                    })}
                                />
                                <Input
                                    label="Country"
                                    value={deliveryFormData.deliveryAddress.country}
                                    onChange={(e) => setDeliveryFormData({
                                        ...deliveryFormData,
                                        deliveryAddress: { ...deliveryFormData.deliveryAddress, country: e.target.value }
                                    })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <Input
                                    label="Contact Name"
                                    value={deliveryFormData.deliveryAddress.contactName}
                                    onChange={(e) => setDeliveryFormData({
                                        ...deliveryFormData,
                                        deliveryAddress: { ...deliveryFormData.deliveryAddress, contactName: e.target.value }
                                    })}
                                />
                                <Input
                                    label="Contact Phone"
                                    value={deliveryFormData.deliveryAddress.contactPhone}
                                    onChange={(e) => setDeliveryFormData({
                                        ...deliveryFormData,
                                        deliveryAddress: { ...deliveryFormData.deliveryAddress, contactPhone: e.target.value }
                                    })}
                                />
                            </div>
                        </div>
                        <Input
                            label="Notes"
                            as="textarea"
                            rows={3}
                            value={deliveryFormData.notes}
                            onChange={(e) => setDeliveryFormData({ ...deliveryFormData, notes: e.target.value })}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsDeliveryModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdateDelivery}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Hidden PDF Template for Printing */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
                <div ref={pdfTemplateRef}>
                    {order && (
                        <POSOrderPDFTemplate 
                            order={order} 
                            companyProfile={companyProfile} 
                            withLetterhead={true}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderDetailPage;






