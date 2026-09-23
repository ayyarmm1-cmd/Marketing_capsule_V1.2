import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { POSProduct, POSProductVariant, InventoryTransaction, InventoryTransactionType, POSOrder, POSOrderStatus } from '../../types';
import { 
    apiGetPOSProductById,
    apiUpdatePOSProduct,
    apiDeletePOSProduct,
    apiGetInventoryTransactions,
    apiAddInventoryTransaction,
    apiGetPOSOrders,
    apiGetPOSCategories
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';

const ProductDetailPage: React.FC = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    
    const [product, setProduct] = useState<POSProduct | null>(null);
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [orders, setOrders] = useState<POSOrder[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'variants' | 'inventory' | 'orders'>('overview');
    
    // Edit modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        sku: '',
        name: '',
        description: '',
        category: '',
        categoryId: '',
        priceMMK: 0,
        costMMK: 0,
        stockQuantity: 0,
        minStockQuantity: 0,
        taxPercentage: 0,
        isActive: true,
    });
    
    // Stock In modal states
    const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
    const [stockInFormData, setStockInFormData] = useState({
        quantity: 0,
        costMMK: 0,
        notes: '',
    });
    
    // Variant modal states
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState<POSProductVariant | null>(null);
    const [variantFormData, setVariantFormData] = useState({
        name: '',
        sku: '',
        priceMMK: 0,
        stockQuantity: 0,
        isActive: true,
    });

    useEffect(() => {
        if (productId) {
            fetchData();
        }
    }, [productId]);

    const fetchData = useCallback(async () => {
        if (!productId) return;
        
        setIsLoading(true);
        try {
            const [fetchedProduct, fetchedTransactions, fetchedCategories, allOrders] = await Promise.all([
                apiGetPOSProductById(productId),
                apiGetInventoryTransactions(productId),
                apiGetPOSCategories(),
                apiGetPOSOrders(),
            ]);
            
            setProduct(fetchedProduct);
            setTransactions(fetchedTransactions.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ));
            setCategories(fetchedCategories);
            
            // Filter orders that contain this product
            const productOrders = allOrders.filter(order => 
                order.items?.some(item => item.productId === productId)
            );
            setOrders(productOrders);
        } catch (error) {
            console.error("Failed to load product data:", error);
            addNotification("Failed to load product data.", "error");
        }
        setIsLoading(false);
    }, [productId, addNotification]);

    const totalSold = useMemo(() => {
        return orders.reduce((sum, order) => {
            const item = order.items?.find(i => i.productId === productId);
            return sum + (item?.quantity || 0);
        }, 0);
    }, [orders, productId]);

    const totalRevenue = useMemo(() => {
        return orders.reduce((sum, order) => {
            const item = order.items?.find(i => i.productId === productId);
            return sum + (item ? item.quantity * item.priceMMK : 0);
        }, 0);
    }, [orders, productId]);

    const handleEdit = () => {
        if (product) {
            setEditFormData({
                sku: product.sku,
                name: product.name,
                description: product.description || '',
                category: product.category || '',
                categoryId: product.categoryId || '',
                priceMMK: product.priceMMK,
                costMMK: product.costMMK || 0,
                stockQuantity: product.stockQuantity,
                minStockQuantity: product.minStockQuantity || 0,
                taxPercentage: product.taxPercentage || 0,
                isActive: product.isActive,
            });
            setIsEditModalOpen(true);
        }
    };

    const handleSaveEdit = async () => {
        if (!product) return;
        
        try {
            const categoryName = editFormData.categoryId 
                ? categories.find(c => c.id === editFormData.categoryId)?.name || editFormData.category
                : editFormData.category;
            
            await apiUpdatePOSProduct({
                id: product.id,
                ...editFormData,
                category: categoryName,
            });
            addNotification("Product updated successfully!", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to update product: ${errorMessage}`, "error");
        }
    };

    const handleDelete = async () => {
        if (!product) return;
        
        const confirmed = await showConfirmation(
            "Delete Product",
            `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await apiDeletePOSProduct(product.id);
            addNotification("Product deleted successfully!", "success");
            navigate('/pos/products');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to delete product: ${errorMessage}`, "error");
        }
    };

    const handleStockIn = () => {
        if (product) {
            setStockInFormData({
                quantity: 0,
                costMMK: product.costMMK || 0,
                notes: '',
            });
            setIsStockInModalOpen(true);
        }
    };

    const handleStockInSubmit = async () => {
        if (!product || !user || stockInFormData.quantity <= 0) {
            addNotification("Please enter a valid quantity.", "error");
            return;
        }

        try {
            await apiAddInventoryTransaction({
                productId: product.id,
                productName: product.name,
                type: InventoryTransactionType.ADJUSTMENT,
                quantity: stockInFormData.quantity,
                previousQuantity: 0,
                newQuantity: 0,
                costMMK: stockInFormData.costMMK > 0 ? stockInFormData.costMMK : undefined,
                notes: stockInFormData.notes || undefined,
                userId: user.id,
            }, true);

            addNotification("Stock added successfully!", "success");
            setIsStockInModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to add stock: ${errorMessage}`, "error");
        }
    };

    const handleOpenVariantModal = (variant?: POSProductVariant) => {
        if (variant) {
            setEditingVariant(variant);
            setVariantFormData({
                name: variant.name,
                sku: variant.sku || '',
                priceMMK: variant.priceMMK,
                stockQuantity: variant.stockQuantity,
                isActive: variant.isActive,
            });
        } else {
            setEditingVariant(null);
            setVariantFormData({
                name: '',
                sku: '',
                priceMMK: product?.priceMMK || 0,
                stockQuantity: 0,
                isActive: true,
            });
        }
        setIsVariantModalOpen(true);
    };

    const handleVariantSubmit = async () => {
        if (!product || !variantFormData.name || variantFormData.priceMMK <= 0) {
            addNotification("Please fill in variant name and price.", "error");
            return;
        }

        const variant: POSProductVariant = {
            id: editingVariant?.id || `variant_${Date.now()}`,
            name: variantFormData.name,
            sku: variantFormData.sku || undefined,
            priceMMK: variantFormData.priceMMK,
            stockQuantity: variantFormData.stockQuantity,
            isActive: variantFormData.isActive,
        };

        const updatedVariants = editingVariant
            ? (product.variants || []).map(v => v.id === editingVariant.id ? variant : v)
            : [...(product.variants || []), variant];

        try {
            await apiUpdatePOSProduct({
                id: product.id,
                variants: updatedVariants,
            });
            addNotification("Variant saved successfully!", "success");
            setIsVariantModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to save variant: ${errorMessage}`, "error");
        }
    };

    const handleDeleteVariant = async (variantId: string) => {
        if (!product) return;
        
        const confirmed = await showConfirmation(
            "Delete Variant",
            "Are you sure you want to delete this variant?"
        );
        if (!confirmed) return;

        const updatedVariants = (product.variants || []).filter(v => v.id !== variantId);
        
        try {
            await apiUpdatePOSProduct({
                id: product.id,
                variants: updatedVariants,
            });
            addNotification("Variant deleted successfully!", "success");
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to delete variant: ${errorMessage}`, "error");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <p className="text-text-secondary mb-4">Product not found.</p>
                    <Link to="/pos/products">
                        <Button variant="primary">Back to Products</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/pos/products">
                        <Button variant="ghost" size="sm">← Back</Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">{product.name}</h1>
                        <p className="text-text-secondary mt-1">SKU: {product.sku}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="primary" onClick={handleStockIn}>Stock In</Button>
                    {hasPermission('MANAGE_POS_PRODUCTS' as any) && (
                        <>
                            <Button variant="secondary" onClick={handleEdit}>Edit</Button>
                            <Button variant="danger" onClick={handleDelete}>Delete</Button>
                        </>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary">Current Stock</div>
                    <div className={`text-2xl font-bold mt-1 ${product.minStockQuantity && product.stockQuantity <= product.minStockQuantity ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                        {product.stockQuantity}
                    </div>
                    {product.minStockQuantity && (
                        <div className="text-xs text-text-secondary mt-1">Min: {product.minStockQuantity}</div>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary">Total Sold</div>
                    <div className="text-2xl font-bold mt-1">{totalSold}</div>
                    <div className="text-xs text-text-secondary mt-1">units</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary">Total Revenue</div>
                    <div className="text-2xl font-bold mt-1">{totalRevenue.toLocaleString()}</div>
                    <div className="text-xs text-text-secondary mt-1">MMK</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary">Orders</div>
                    <div className="text-2xl font-bold mt-1">{orders.length}</div>
                    <div className="text-xs text-text-secondary mt-1">total orders</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow mb-6">
                <div className="border-b border-gray-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        {(['overview', 'variants', 'inventory', 'orders'] as const).map((tab) => (
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
                                {tab === 'variants' && product.variants && product.variants.length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-primary-action text-white rounded-full">
                                        {product.variants.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Product Images */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Product Images</h3>
                                    {product.images && product.images.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            {product.images.map((image, index) => (
                                                <img
                                                    key={index}
                                                    src={image}
                                                    alt={`${product.name} ${index + 1}`}
                                                    className="w-full h-48 object-cover rounded border border-slate-200 dark:border-slate-700"
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full h-48 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-text-secondary">
                                            No images
                                        </div>
                                    )}
                                </div>

                                {/* Product Details */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Product Details</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-sm text-text-secondary">Name</div>
                                            <div className="font-medium">{product.name}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-text-secondary">SKU</div>
                                            <div className="font-medium">{product.sku}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-text-secondary">Category</div>
                                            <div className="font-medium">{product.category || 'N/A'}</div>
                                        </div>
                                        {product.description && (
                                            <div>
                                                <div className="text-sm text-text-secondary">Description</div>
                                                <div className="font-medium">{product.description}</div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-sm text-text-secondary">Selling Price</div>
                                                <div className="font-medium">{product.priceMMK.toLocaleString()} MMK</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-text-secondary">Opening Cost</div>
                                                <div className="font-medium">{product.costMMK ? `${product.costMMK.toLocaleString()} MMK` : 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-sm text-text-secondary">Current Stock</div>
                                                <div className={`font-medium ${product.minStockQuantity && product.stockQuantity <= product.minStockQuantity ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                                                    {product.stockQuantity} units
                                                </div>
                                            </div>
                                            {product.minStockQuantity && (
                                                <div>
                                                    <div className="text-sm text-text-secondary">Min Stock</div>
                                                    <div className="font-medium">{product.minStockQuantity} units</div>
                                                </div>
                                            )}
                                        </div>
                                        {product.taxPercentage && product.taxPercentage > 0 && (
                                            <div>
                                                <div className="text-sm text-text-secondary">Tax</div>
                                                <div className="font-medium">{product.taxPercentage}%</div>
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-sm text-text-secondary">Status</div>
                                            <span className={`px-2 py-1 rounded-full text-xs ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {product.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="text-sm text-text-secondary">Created</div>
                                            <div className="font-medium">{new Date(product.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Variants Tab */}
                    {activeTab === 'variants' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Product Variants</h3>
                                <Button variant="primary" onClick={() => handleOpenVariantModal()}>
                                    + Add Variant
                                </Button>
                            </div>
                            {product.variants && product.variants.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-100 dark:bg-slate-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">SKU</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Price</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Stock</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {product.variants.map((variant) => (
                                                <tr key={variant.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-4 py-3 text-sm font-medium">{variant.name}</td>
                                                    <td className="px-4 py-3 text-sm">{variant.sku || 'N/A'}</td>
                                                    <td className="px-4 py-3 text-sm">{variant.priceMMK.toLocaleString()} MMK</td>
                                                    <td className="px-4 py-3 text-sm">{variant.stockQuantity}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${variant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                            {variant.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm space-x-2">
                                                        <Button size="sm" variant="ghost" onClick={() => handleOpenVariantModal(variant)}>Edit</Button>
                                                        <Button size="sm" variant="danger" onClick={() => handleDeleteVariant(variant.id)}>Delete</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded">
                                    <p className="text-text-secondary mb-4">No variants added yet.</p>
                                    <Button variant="primary" onClick={() => handleOpenVariantModal()}>
                                        + Add First Variant
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Inventory Tab */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Inventory Transaction History</h3>
                            {transactions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-100 dark:bg-slate-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Quantity</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Cost/Unit</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Previous</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">New</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {transactions.map((transaction) => (
                                                <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-4 py-3 text-sm">
                                                        {new Date(transaction.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {transaction.quantity > 0 ? 'Stock In' : 'Stock Out'}
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm font-semibold ${transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {transaction.costMMK ? `${transaction.costMMK.toLocaleString()} MMK` : 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">{transaction.previousQuantity}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold">{transaction.newQuantity}</td>
                                                    <td className="px-4 py-3 text-sm">{transaction.notes || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded">
                                    <p className="text-text-secondary">No inventory transactions found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Orders Containing This Product</h3>
                            {orders.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-100 dark:bg-slate-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Order #</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Quantity</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Price</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Total</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {orders.map((order) => {
                                                const item = order.items?.find(i => i.productId === productId);
                                                return (
                                                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                        <td className="px-4 py-3 text-sm font-medium">
                                                            <Link to={`/pos/orders/${order.id}`} className="text-primary-action hover:underline">
                                                                {order.orderNumber}
                                                            </Link>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {new Date(order.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">{order.customerName}</td>
                                                        <td className="px-4 py-3 text-sm">{item?.quantity || 0}</td>
                                                        <td className="px-4 py-3 text-sm">{item?.priceMMK.toLocaleString() || '0'} MMK</td>
                                                        <td className="px-4 py-3 text-sm font-semibold">
                                                            {((item?.quantity || 0) * (item?.priceMMK || 0)).toLocaleString()} MMK
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                                order.status === POSOrderStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                                                                order.status === POSOrderStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded">
                                    <p className="text-text-secondary">No orders found for this product.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && product && (
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title="Edit Product"
                >
                    <div className="space-y-4">
                        <Input
                            label="SKU *"
                            value={editFormData.sku}
                            onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                        />
                        <Input
                            label="Name *"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        />
                        <Input
                            label="Description"
                            as="textarea"
                            rows={3}
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        />
                        <Select
                            label="Category"
                            value={editFormData.categoryId}
                            onChange={(e) => {
                                const selectedCat = categories.find(c => c.id === e.target.value);
                                setEditFormData({
                                    ...editFormData,
                                    categoryId: e.target.value,
                                    category: selectedCat?.name || ''
                                });
                            }}
                            options={[
                                { value: '', label: 'Select Category' },
                                ...categories.filter(c => c.isActive).map(cat => ({ value: cat.id, label: cat.name }))
                            ]}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Selling Price (MMK) *"
                                type="number"
                                value={editFormData.priceMMK}
                                onChange={(e) => setEditFormData({ ...editFormData, priceMMK: Number(e.target.value) || 0 })}
                            />
                            <Input
                                label="Opening Cost (MMK)"
                                type="number"
                                value={editFormData.costMMK}
                                onChange={(e) => setEditFormData({ ...editFormData, costMMK: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <Input
                            label="Opening Stock Quantity"
                            type="number"
                            value={editFormData.stockQuantity}
                            onChange={(e) => setEditFormData({ ...editFormData, stockQuantity: Number(e.target.value) || 0 })}
                        />
                        <Input
                            label="Min Stock Quantity (for alerts)"
                            type="number"
                            value={editFormData.minStockQuantity}
                            onChange={(e) => setEditFormData({ ...editFormData, minStockQuantity: Number(e.target.value) || 0 })}
                        />
                        <Input
                            label="Tax Percentage"
                            type="number"
                            value={editFormData.taxPercentage}
                            onChange={(e) => setEditFormData({ ...editFormData, taxPercentage: Number(e.target.value) || 0 })}
                        />
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={editFormData.isActive}
                                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="isActive" className="text-sm">Active</label>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSaveEdit}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Stock In Modal */}
            {isStockInModalOpen && product && (
                <Modal
                    isOpen={isStockInModalOpen}
                    onClose={() => setIsStockInModalOpen(false)}
                    title="Stock In"
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                            <div className="text-sm text-text-secondary">Product</div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-text-secondary mt-1">Current Stock: {product.stockQuantity}</div>
                        </div>
                        <Input
                            label="Quantity *"
                            type="number"
                            value={stockInFormData.quantity}
                            onChange={(e) => setStockInFormData({ ...stockInFormData, quantity: Number(e.target.value) || 0 })}
                            placeholder="Enter quantity to add"
                        />
                        <Input
                            label="Cost per Unit (MMK) *"
                            type="number"
                            value={stockInFormData.costMMK}
                            onChange={(e) => setStockInFormData({ ...stockInFormData, costMMK: Number(e.target.value) || 0 })}
                            placeholder="Cost for this stock in"
                        />
                        <Input
                            label="Notes (optional)"
                            as="textarea"
                            rows={3}
                            value={stockInFormData.notes}
                            onChange={(e) => setStockInFormData({ ...stockInFormData, notes: e.target.value })}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsStockInModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleStockInSubmit}>Stock In</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Variant Modal */}
            {isVariantModalOpen && (
                <Modal
                    isOpen={isVariantModalOpen}
                    onClose={() => setIsVariantModalOpen(false)}
                    title={editingVariant ? 'Edit Variant' : 'New Variant'}
                >
                    <div className="space-y-4">
                        <Input
                            label="Variant Name *"
                            value={variantFormData.name}
                            onChange={(e) => setVariantFormData({ ...variantFormData, name: e.target.value })}
                            placeholder="e.g., Size: Large, Color: Red"
                        />
                        <Input
                            label="Variant SKU (optional)"
                            value={variantFormData.sku}
                            onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Price (MMK) *"
                                type="number"
                                value={variantFormData.priceMMK}
                                onChange={(e) => setVariantFormData({ ...variantFormData, priceMMK: Number(e.target.value) || 0 })}
                            />
                            <Input
                                label="Stock Quantity"
                                type="number"
                                value={variantFormData.stockQuantity}
                                onChange={(e) => setVariantFormData({ ...variantFormData, stockQuantity: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="variantIsActive"
                                checked={variantFormData.isActive}
                                onChange={(e) => setVariantFormData({ ...variantFormData, isActive: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="variantIsActive" className="text-sm">Active</label>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsVariantModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleVariantSubmit}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ProductDetailPage;






