import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { InventoryTransaction, InventoryTransactionType, POSProduct } from '../../types';
import { apiGetInventoryTransactions, apiAddInventoryTransaction, apiGetPOSProducts, apiGetLowStockProducts } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';
import InventoryExcelImportModal from './InventoryExcelImportModal';

const InventoryManagementPage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [products, setProducts] = useState<POSProduct[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<POSProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string>('');

    const [formData, setFormData] = useState({
        productId: '',
        type: InventoryTransactionType.ADJUSTMENT,
        quantity: 0,
        notes: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedTransactions, fetchedProducts, lowStock] = await Promise.all([
                apiGetInventoryTransactions(),
                apiGetPOSProducts(),
                apiGetLowStockProducts(),
            ]);
            setTransactions(fetchedTransactions);
            setProducts(fetchedProducts);
            setLowStockProducts(lowStock);
        } catch (error) {
            console.error("Failed to load inventory data:", error);
            addNotification("Failed to load inventory data.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    const handleOpenModal = (productId?: string) => {
        setFormData({
            productId: productId || '',
            type: InventoryTransactionType.ADJUSTMENT,
            quantity: 0,
            notes: '',
        });
        setIsModalOpen(true);
    };

    const handleDownloadTemplate = () => {
        const headers = [
            'Product Name*',
            'SKU (Optional)',
            'Price MMK*',
            'Cost MMK (Optional)',
            'Stock Quantity*',
            'Min Stock Quantity (Optional)',
            'Category (Optional)',
            'Colour of Frame*',
            'Colour of Glass*',
            'Description (Optional)'
        ];
        
        const ws = XLSX.utils.json_to_sheet([
            {
                "Product Name*": "Sunglasses",
                "SKU (Optional)": "SUN-001",
                "Price MMK*": "5000",
                "Cost MMK (Optional)": "3000",
                "Stock Quantity*": "10",
                "Min Stock Quantity (Optional)": "5",
                "Category (Optional)": "Eyewear",
                "Colour of Frame*": "Black",
                "Colour of Glass*": "Clear",
                "Description (Optional)": "Classic black frame with clear glass"
            },
            {
                "Product Name*": "Sunglasses",
                "SKU (Optional)": "SUN-002",
                "Price MMK*": "5000",
                "Cost MMK (Optional)": "3000",
                "Stock Quantity*": "15",
                "Min Stock Quantity (Optional)": "5",
                "Category (Optional)": "Eyewear",
                "Colour of Frame*": "Black",
                "Colour of Glass*": "Blue",
                "Description (Optional)": "Classic black frame with blue glass"
            },
            {
                "Product Name*": "Sunglasses",
                "SKU (Optional)": "SUN-003",
                "Price MMK*": "5500",
                "Cost MMK (Optional)": "3200",
                "Stock Quantity*": "8",
                "Min Stock Quantity (Optional)": "5",
                "Category (Optional)": "Eyewear",
                "Colour of Frame*": "Brown",
                "Colour of Glass*": "Green",
                "Description (Optional)": "Brown frame with green glass"
            }
        ], { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "pos_inventory_import_template.xlsx");
    };

    const handleSubmit = async () => {
        if (!formData.productId || formData.quantity === 0) {
            addNotification("Please select a product and enter a quantity.", "error");
            return;
        }

        if (!user) {
            addNotification("User not authenticated.", "error");
            return;
        }

        try {
            const product = products.find(p => p.id === formData.productId);
            if (!product) {
                addNotification("Product not found.", "error");
                return;
            }

            await apiAddInventoryTransaction({
                productId: formData.productId,
                productName: product.name,
                type: formData.type,
                quantity: formData.quantity,
                previousQuantity: 0, // Will be calculated in API
                newQuantity: 0, // Will be calculated in API
                notes: formData.notes || undefined,
                userId: user.id,
            }, true);

            addNotification("Inventory transaction recorded successfully!", "success");
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to record transaction: ${errorMessage}`, "error");
        }
    };

    const filteredTransactions = selectedProductId
        ? transactions.filter(t => t.productId === selectedProductId)
        : transactions;

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
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Inventory Management</h1>
                <div className="flex gap-2">
                    <Button onClick={handleDownloadTemplate} variant="ghost" size="sm">📥 Download Excel Template</Button>
                    <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">Import from Excel</Button>
                    <Button onClick={() => handleOpenModal()} variant="primary">+ Record Transaction</Button>
                </div>
            </div>

            {/* Low Stock Alerts */}
            {lowStockProducts.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-2">Low Stock Alerts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {lowStockProducts.map(product => (
                            <div key={product.id} className="bg-white dark:bg-slate-800 p-3 rounded border">
                                <div className="font-semibold">{product.name}</div>
                                <div className="text-sm text-text-secondary">Stock: {product.stockQuantity}</div>
                                <div className="text-sm text-text-secondary">Reorder Point: {product.reorderPoint}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Current Stock Levels */}
            <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow mb-6">
                <h2 className="text-lg font-semibold mb-4">Current Stock Levels</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {products.filter(p => p.isActive).map(product => (
                        <div key={product.id} className="border border-slate-200 dark:border-slate-700 rounded p-3">
                            <div className="font-semibold truncate">{product.name}</div>
                            <div className="text-sm text-text-secondary">SKU: {product.sku}</div>
                            <div className="text-lg font-bold mt-2">
                                {product.stockQuantity} units
                            </div>
                            {product.reorderPoint && product.stockQuantity <= product.reorderPoint && (
                                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Low Stock!</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow mb-6">
                <Select
                    label="Filter by Product"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    options={[
                        { value: '', label: 'All Products' },
                        ...products.map(p => ({ value: p.id, label: p.name }))
                    ]}
                    containerClassName="mb-0"
                />
            </div>

            {/* Transaction History */}
            <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <h2 className="text-lg font-semibold p-4">Transaction History</h2>
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Product</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Previous</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">New</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredTransactions.map(transaction => (
                            <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm">
                                    {new Date(transaction.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">{transaction.productName}</td>
                                <td className="px-4 py-3 text-sm">{transaction.type}</td>
                                <td className={`px-4 py-3 text-sm font-semibold ${transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                                </td>
                                <td className="px-4 py-3 text-sm">{transaction.previousQuantity}</td>
                                <td className="px-4 py-3 text-sm font-semibold">{transaction.newQuantity}</td>
                                <td className="px-4 py-3 text-sm">{transaction.notes || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                    <p className="text-center text-text-secondary py-8">No transactions found.</p>
                )}
            </div>

            {isModalOpen && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Record Inventory Transaction"
                >
                    <div className="space-y-4">
                        <Select
                            label="Product *"
                            value={formData.productId}
                            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                            options={[
                                { value: '', label: 'Select Product' },
                                ...products.filter(p => p.isActive).map(p => ({ value: p.id, label: p.name }))
                            ]}
                        />
                        <Select
                            label="Transaction Type *"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as InventoryTransactionType })}
                            options={Object.values(InventoryTransactionType).map(type => ({ value: type, label: type }))}
                        />
                        <Input
                            label="Quantity *"
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 0 })}
                            placeholder="Positive for in, negative for out"
                        />
                        <Input
                            label="Notes"
                            as="textarea"
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSubmit}>Record</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {isImportModalOpen && (
                <InventoryExcelImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportComplete={() => {
                        setIsImportModalOpen(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default InventoryManagementPage;






